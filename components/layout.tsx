import Head from 'next/head';
import Link from 'next/link';
import styles from './layout.module.css';
import utilStyles from '../styles/utils.module.css';
import { configs } from '../lib/configs';

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
        content="Learn how to build a personal website using Next.js"
      />
      <meta
        property="og:image"
        content={`https://og-image.now.sh/${encodeURI(
          configs.siteTitle,
        )}.png?theme=light&md=0&fontSize=75px&images=https%3A%2F%2Fassets.zeit.co%2Fimage%2Fupload%2Ffront%2Fassets%2Fdesign%2Fnextjs-black-logo.svg`}
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
