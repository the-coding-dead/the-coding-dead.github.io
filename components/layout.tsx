import Head from 'next/head';
import Header from './header';
import Footer from './footer';
import configs from '../lib/configs';

const Layout = ({
  children,
  title = '',
  description = '',
}: {
  children: JSX.Element;
  title?: string;
  description?: string;
}) => (
  <>
    <Head>
      <title>
        {(title && `${title} - ${configs.siteTitle}`)
          || `${configs.siteTitle} - ${configs.description}`}
      </title>
      <link rel="icon" href="/favicon.ico" />
      <meta name="description" content={description || configs.description} />
      <meta property="og:image" content={configs.ogImage} />
      <meta
        name="og:title"
        content={
          (title && `${title} - ${configs.siteTitle}`)
          || `${configs.siteTitle} - ${configs.description}`
        }
      />
      <meta
        name="og:description"
        content={description || configs.description}
      />
      <meta name="twitter:card" content="summary" />
    </Head>
    <Header />
    <div className="container mx-auto">
      <div className="container h-screen flex flex-col">
        <div className="container px-2 flex-grow ">
          <main>{children}</main>
        </div>
        <Footer />
      </div>
    </div>
  </>
);

export default Layout;
