import Head from 'next/head';
import Link from 'next/link';
import configs from '../lib/configs';

const Layout = ({
  children,
  home = false,
  title = '',
  description = '',
}: {
  children: JSX.Element;
  home: boolean;
  title?: string;
  description?: string;
}) => (
  <div className="container mx-auto px-4">
    <Head>
      <link rel="icon" href="/favicon.ico" />
      <meta name="description" content={description || configs.description} />
      <meta property="og:image" content={configs.ogImage} />
      <meta name="og:title" content={title || configs.siteTitle} />
      <meta
        name="og:description"
        content={description || configs.description}
      />
      <meta name="twitter:card" content="summary" />
    </Head>
    <main>{children}</main>
    {!home && (
      <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
        <Link href="/">← Back to home</Link>
      </div>
    )}
  </div>
);

export default Layout;
