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
        {(title && `${configs.siteTitle} | ${title}`) || configs.siteTitle}
      </title>
      <link rel="icon" href="/favicon.ico" />
      <meta name="description" content={description || configs.description} />
      <meta property="og:image" content={configs.ogImage} />
      <meta
        name="og:title"
        content={
          (title && `${configs.siteTitle} | ${title}`) || configs.siteTitle
        }
      />
      <meta
        name="og:description"
        content={description || configs.description}
      />
      <meta name="twitter:card" content="summary" />
    </Head>
    <div className="container h-screen flex flex-col min-h-screen">
      <Header />
      <div className="container mx-2 px-4 mx-auto flex-grow">
        <main>{children}</main>
      </div>
      <Footer />
    </div>
  </>
);

export default Layout;
