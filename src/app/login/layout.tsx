


/**
 * The metadata of the actions page
 */
export function generateMetaData() {
    return {
        title: "Authentication"
    }
}

export default function LoginLayout({children}:Readonly<{
    children: React.ReactNode;
  }>) {

    return (<div className="login">{children}</div>);
  }