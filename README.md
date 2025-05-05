Ars Magica 5 Definite Edition Spell Designer
============================================

This is a server to run Ars Magica 5 Definite Edition spell designer.

## Installation

To install all dependencies, perform installation of node modules.
```bash
npm -i
```

## Configuration

There is two ways to configure the application: 

### Setup environmental variables

Environmental variables can be set in the shell, in .env file, or in .env.admin for
administrator script environment. The environment files are put into the root
directory of the project. 

#### API environmental variables

These variables determines the API access values.
They may be set in user's environment, or in the user environment file .env.

|Variable|Scope|Description|Default|
| :---: | :---: | :---: | :---: |
|DATA_CONNECT|Api|The database connection URL for api database|No connection Url. Use variables below.|
|DATA_HOST|Api|The api server host|"localhost"|
|DATA_DATABASE|Api|The api database name|Usre name (process.env.USER)|
|DATA_PORT|Api|The api database port|5432|
|DATA_USER|Api|The api database user|User name (process.env.USER)|
|DATA_PASSWORD|Api|The api database user password|No password (null)|

#### Authentication environmental variables

These variables determiens the authentication database access. They may be set in the 
user's environment, or in the user environment file .env.

|Variable|Scope|Description|Default|
| :---: | :---: | :---: | :---: |
|AUTH_CONNECT|Authentication|The database connection URL for the authentication database|No conneciton Url. Use variables below|
|AUTH_HOST|Authentication|The authentication server host|"localhost"|
|AUTH_DATABASE|Authentication|The authentication database name|User name (process.env.USER)|
|AUTH_PORT|Authentication|The authentication database port|5432|
|AUTH_USER|Authentication|The authentication database user|User name (process.env.USER)|
|AUTH_PASSWORD|Authentication|The authentication database user password|No password (null)|

#### Script enviroment variables 

The script uses both authentication and api environment variables, but allows setting
specific variables for scripts to access the database. 
They should be set in user's environment, or in the administartor environemnt file .env.admin.

If admnistrator user is not designated, the same database uses should have rights to create, drop, insert,
sequence, and reference priviledges for the database.

The administartor access uses corresponding user database variables except connection, user, and password
variables, which are replaced with variables: 

| :---: | :---: | :---: | :---: |
|DATA_ADMIN_CONNECT|Api|The administrator database connection URL for api database|The api database connection url (process.env.DATA_CONNECT) or use variables below|
|DATA_ADMIN|Api|The database user|The Api database administrator user name (process.env.API_USER)|
|DATA_ADMIN_PASSWORD|Api|The Api database user password|The Api database user name (process.env.API_PASSWORD)|
|AUTH_ADMIN_CONNECT|Authentication|The administrator database connection URL for the authentication database|The authentication database connection url (process.env.AUTH_CONNECT) or use variables below.|
|AUTH_ADMIN|Authentication|The database user|The authentication database administrator user name (process.env.AUTH_USER)|
|AUTH_ADMIN_PASSWORD|Authentication|The Api database user password|The authentication database user name (process.env.AUTH_PASSWORD)|

### Altering configuration files. 

## Database initialization

Database initialization must be performed from database dump at the moment.

## Running 

To start the development version, please run following commands:

```bash
npm run dev
```

To start the production version, please run following commands:
```bash
npm run build && npm start
``` 

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
