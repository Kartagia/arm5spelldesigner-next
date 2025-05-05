import { createApiConnection, createAuthConnection, createAuthDb, deleteAuthDb, escapeIdentifier, initApiPool, initAuthPool } from "../lib/db";
import { checkUUID } from "../lib/modifiers";
import { UUID } from "node:crypto";
import { createInterface, Interface } from "node:readline";

/**
 * Database administrator tool.
 */

interface ArgumentInfo {
    name: string;
    optional?: boolean;
    description?: string[];
    summary: string;
    value?: string;
}

/**
 * Get the argument name in command line.
 * @param arg The argument.
 * @returns The command line of the argument.
 */
function getArgumentName(arg: ArgumentInfo): string {
    return (arg.optional ? `[${arg.name}]` : arg.name);
}

/**
 * Get the argument summary.
 * @param arg The argument.
 * @returns The argument summary text.
 */
function getArgumentSummary(arg: ArgumentInfo): string {
    return `${arg.optional ? "Optional" : ""}${arg.value ? (arg.optional ? " " : "") + arg.value + ". " : (arg.optional ? ". " : "")}${arg.summary}.`
}


/**
 * Get the argument description lines.
 * @param arg The argument.
 * @returns The argument description lines. 
 */
function getArgumentDescription(arg: ArgumentInfo): string[] {
    return arg.description ?? [];
}

interface SwitchInfo {
    /**
     * The name of the switch.
     */
    name: string;
    /**
     * Type of the switch. 
     * @defaults "boolean" The default switch is set or unset.
     */
    type: string;
    /**
     * Is the switch required.
     */
    required?: boolean;
    /**
     * Does the option have value. 
     */
    hasValue?: boolean;
    summary?: string;
    description?: string[];

}

interface CommandInfo {
    name: string;
    summary: string;
    description?: string[],
    subCommands: Map<string, CommandInfo>;
    arguments: ArgumentInfo[],
    switches: Map<string, SwitchInfo>
}

const commands = new Map<string, CommandInfo>();
const helpInfo: CommandInfo = {
    name: "help",
    summary: "Print help on commands.",
    switches: new Map<string, SwitchInfo>(),
    arguments: [] as ArgumentInfo[],
    subCommands: new Map<string, CommandInfo>()
};
commands.set("help", helpInfo);
const createCmd: CommandInfo = {
    name: "create",
    summary: "Creates something.",
    switches: new Map<string, SwitchInfo>(),
    arguments: [] as ArgumentInfo[],
    subCommands: new Map<string, CommandInfo>()
}
const dbSubCommand: Required<Pick<CommandInfo, "name" | "summary" | "arguments">> = {
    name: "db",
    summary: "database",
    arguments: [{ name: "module", optional: false, summary: "The created database module." }] as ArgumentInfo[]
};
createCmd.subCommands.set("db", {
    ...dbSubCommand,
    summary: `Create a ${dbSubCommand.summary}.`,
    switches: new Map<string, SwitchInfo>(),
    subCommands: new Map<string, CommandInfo>(),
    description: ["Creates a database module on the database.",
        "",
        "Modules: api, auth."
    ]
});

helpInfo.subCommands.set("create", createCmd);

const rl = createInterface(process.stdin, undefined, undefined, false);

rl.prompt();

function unescapeQuoted(quoted: string): string {
    return quoted.slice(1, quoted.length - 1).replaceAll(/\\(.)/g, "$1")
}

function escapeQuoted(source: string): string {
    return `"${source.replaceAll(/([\\\"])/g, "\\$1")}"`;
}

async function createDatabase(switches: Record<string, string[]>, args: string[]): Promise<string> {
    switch (args[0]) {
        case "api":
            return await createApiConnection().catch((err) => {
                return initApiPool(undefined).then((pool) => (pool.connect()))
            }).then(
                async dbh => {
                    console.debug("Database acquired");

                    if (switches.clean?.includes("true")) {
                        // Cleaning up the tables.
                        ["arts"].forEach(async tableName => {
                            await dbh.query("DROP TABLE IF EXISTS " + escapeIdentifier(tableName) + " CASCADE");
                        });
                    }

                    await dbh.query("CREATE TABLE IF NOT EXISTS arts(guid UUID primary key, name varchar(80) not null, abbrev varchar(5) not null)");
                    await dbh.query("CREATE TABLE IF NOT EXISTS magicstyles(guid UUID primary key, name varchar(80) not null)");
                    await dbh.query("CREATE TABLE IF NOT EXISTS style_arts(" +
                        [
                            "art_id UUDNOT NULL REFERENCES arts(guid) ON UPDATE CASCADE ON DELETE CASCADE",
                            "style_id UUID NOT NULL REFERENCES magicstyles(guid) ON UPDATE CASCADE ON DELETE CASCADE",
                            "type varchar(20) not null",
                            "PRIMARY KEY (art_id, style_id)"
                        ].join(", ") +
                        ")");
                    await dbh.query("CREATE VIEW IF NOT EXISTS artsview AS " +
                        "SELECT art_id, style_id, type, concat('art.', lower(type)) as ref_type, arts.name as name, abbrev, magicstyles.name as style " +
                        "FROM (arts JOIN style_arts ON arts.guid = art_id) JOIN magicstyles on style_id = magicstyle.guid");
                    if (switches.populate.includes("true")) {
                        console.debug("Populating the table.")
                        try {
                            await dbh.query("begin");
                            const styleIds = await dbh.query<String>("INSERT INTO magicstyles(name) VALUES ($1) RETURNING guid", ["Hermetic"]).then(
                                (result) => {
                                    return result.rows.map( (uuid) => (checkUUID(uuid)));
                                }
                            )
                            await dbh.query("INSERT INTO arts(name, abbrev) FROM SELECT name, substring(name FOR 2) as abbrev) FROM unnest(ARRAY[$1,$2,$3,$4,$5]) as a(name) RETURNING (guid)", ["Creo", "Intellego", "Muto", "Perdo", "Rego"])
                            .then( (createdIds) => {
                               dbh.query("INSERT INTO style_arts(art_id, style_id, type) "+
                                "SELECT art_id FROM unnest($1) as art(art_id) JOIN SELECT style_id FROM unnest($2) as style(style_id)", 
                                [createdIds.rows.map( row => (row.guid)), styleIds]) 
                            });

                            await dbh.query("commit");
                            console.log("Populate committed");
                        } catch (err) {
                            console.debug("Database rolled back.")
                            await dbh.query("rollback");
                            dbh.release();
                            console.debug("Database released");
                        }
                    }
                }
            ).then( 
                (result) => {
                    return "API databases created successfully";
                },
                (error) => {
                    return "Creation failed due " + error.message
                }
            );
            break;
        case "auth":
            return createAuthConnection().catch((err) => {
                return initAuthPool(undefined).then((pool) => (pool.connect()))
            }).then(
                dbh => {
                    console.debug("Database ackquired");
                    createAuthDb(dbh, { clean: switches.init?.includes("true"), populate: switches.populate?.includes("true") }
                    ).finally(() => {
                        dbh.release();
                        console.debug("Database released");
                    })
                }
            ).then(
                (result) => {
                    return "Authentication database created successfully";
                }, 
                (error) => {
                    return "Authentication database creation failed: " + error;
                }
            );
            break;
        default:
            return "Unknown create db target. Try help create db";
    }

}

function createUser(switches: Record<string, string[]>, args: string[]): string {


    return "Unknown create user target. Try help create user";
}

function getHelp(target: CommandInfo | SwitchInfo | ArgumentInfo | undefined, switches: Record<string, string[]>, args: string[], prefix: string = ""): string[] {
    const lines: string[] = [];
    if (target) {
        // We do have help command.
        const helpTarget = args[0];
        if ("switches" in target) {
            if (helpTarget) {
                if (helpTarget.startsWith("--")) {
                    // Help from command switch.
                    if (target.switches.has(helpTarget.substring(2))) {

                    } else {
                        return [`${prefix}Command: ${target.name}: Unknown switch ${helpTarget}`];
                    }
                }
            } else {
                lines.push(`${prefix}${target.name} ${target.arguments.map(arg => getArgumentName(arg)).join(" ")}`);
                if (target.summary) {
                    lines.push(prefix + "  " + target.summary);
                }
                if (target.switches.size > 0) {
                    lines.push(prefix + "SWITCHES");
                    for (const opt in target.switches.keys()) {
                        lines.push(...getHelp(target.switches.get(opt), { summary: ["true"] }, [], prefix + "  "));
                    }
                }
                if (target.arguments.length > 0) {
                    lines.push(prefix + "ARGUMENTS");
                    target.arguments.forEach(arg => {
                        lines.push(...getHelp(arg, { summary: ["full"] }, [], prefix + "  "));
                    });
                }
                if (target.description) {
                    lines.push(prefix + "DESCRIPTION");
                    lines.push(...target.description.map(line => `${prefix}\t${line}`));
                }
            }
        } else if ("type" in target) {
            // Switch target.
            if (switches.summary.includes("summary") || switches.summary.includes("full")) {
                // Add the title bar.
                lines.push(`${prefix}\t${target.name}\t${target.summary ?? ""}`);
            }
            if (switches.summary.includes("full") || switches.summary.includes("description")) {
                // Argument description.
                lines.push(... (target.description ?? []).map(line => (`${prefix}  ${line}`)));
            }
        } else {
            // Argument target
            if (switches.summary.includes("summary") || switches.summary.includes("full")) {
                lines.push(`${prefix}\t${target.name}\t${getArgumentSummary(target)}`);
            }
            if (switches.summary.includes("full") || switches.summary.includes("description")) {
                // Argument description.
                lines.push(...getArgumentDescription(target).map(line => (`${prefix}${line}`)));
            }
        }
    } else if (args.length > 0) {
        lines.push(...getHelp(commands.get(args[0]), switches, args.slice(1), prefix));
    } else {
        // Printing help on help.
        const lines: string[] = [];
        lines.push(prefix + "Help on commands of the db administrator");
        for (const cmdName in commands.keys()) {
            lines.push(...getHelp(commands.get(cmdName), {}, [], prefix + "  "));
        }
    }
    return lines;
}

function printHelp(target: CommandInfo | SwitchInfo | ArgumentInfo | undefined, switches: Record<string, string[]>, args: string[], prefix: string = ""): string {
    return getHelp(target, switches, args, prefix).join("\n");
}

function performHelp(switches: Record<string, string[]>, args: string[]): string {
    if (args.length === 0) {
        console.log("Printing help");
        return printHelp(undefined, switches, args);
    } else {
        console.log("Printing help on " + args[0] + " with args " + args.slice(1));
        return printHelp(commands.get(args[0]), switches, args.slice(1));
    }
}


function performCommand(cmdName: string, switches: Record<string, string[]>, args: string[]) {
    switch (cmdName) {
        case "quit":
            rl.close();
            break;
        case "create":
            switch (args[0]) {
                case "db":
                    console.log(createDatabase(switches, args.slice(1,)));
                    break;
                case "user":
                    console.log(createUser(switches, args.slice(1,)));
                    break;

                default:
                    console.error("Unknown %s target %s", cmdName, args[0]);
            }
            break;
        case "delete":
            switch (args[0]) {

                default:
                    console.error("Unknown %s target %s. Try help %s", cmdName, args[0], cmdName);
            }
            break;
        case "delete":
            switch (args[0]) {

                default:
                    console.error("Unknown %s target %s. Try help %s", cmdName, args[0], cmdName);
            }
            break;
        case "help":
            if (args.length) {
                console.log(performHelp(switches, args));
            }
            break;
        default:
            console.error("Unknown command: %s", cmdName);
    }
}

rl.on("line", (line) => {
    const cmd = line.trim().split(/(?:((?:\s+|^)--\w+(?:=(?:"(?:[^\\"]+|\\.)+"|\w+))?\s*)|\s+)/u);
    console.error("Read line:%s", line);
    console.error("Commands:", cmd.join(", "));
    const { command, switches, args } = cmd.reduce((result, arg) => {
        if (!result.skipSwitches) {
            const match = /^\s*--(\w+)(?:=(?:"(.*)"|(\w+)))?$/.exec(arg);
            if (match) {
                const option = (match[1].startsWith("no")) ? { name: match[1].substring(2), negated: true } : { name: match[1], negated: false };
                if (option.name) {
                    if (option.name in result.switches) {
                        result.switches[option.name].push(match[2] ? unescapeQuoted(match[2]) : (match[3] ?? option.negated));
                    } else {
                        result.switches[option.name] = [match[2] ? unescapeQuoted(match[2]) : (match[3] ?? option.negated)];
                    }
                } else {
                    // The end of switches.
                    result.skipSwitches = true;
                }
                return result;
            }
        }
        if (arg !== undefined && arg.trim().length > 0) {
            if (result.command.length === 0) {
                result.command = arg;
            } else {
                result.args.push(arg);
            }
        }
        return result;
    }, { command: "", switches: {} as Record<string, string[]>, args: [] as string[], skipSwitches: false });
    console.table({ command, switches, args });
    performCommand(command, switches, args);

    rl.prompt();
}).on("close", () => {
    console.log("Quitting...");
    process.exit(0);
});
