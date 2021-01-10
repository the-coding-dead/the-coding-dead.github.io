import Head from 'next/head';
import Link from 'next/link';
import styles from './layout.module.css';
import configs from '../lib/configs';

const Layout = ({
  children,
  home = false,
}: {
  children: JSX.Element;
  home: boolean;
}) => (
  <div className={styles.container}>
    <Head>
      <link rel="icon" href="/favicon.ico" />
      <meta
        name="description"
        content={configs.siteTitle}
      />
      <meta
        property="og:image"
        content="https://raw.githubusercontent.com/the-coding-dead/the-coding-dead.github.io/main/public/images/og-image.svg"
      />
      <meta name="og:title" content={configs.siteTitle} />
      <meta name="twitter:card" content="summary_large_image" />
    </Head>
    <main>{children}</main>
    {!home && (
      <div className={styles.backToHome}>
        <Link href="/">← Back to home</Link>
      </div>
    )}
  </div>
);

export default Layout;
