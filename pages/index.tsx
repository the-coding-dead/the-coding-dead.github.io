import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/layout';
import configs from '../lib/configs';
import utilStyles from '../styles/utils.module.css';
import { getSortedPostsData, PostData } from '../lib/posts';
import Date from '../components/date';

const Home = ({ allPostsData }: { allPostsData: PostData[] }) => (
  <Layout home>
    <>
      <Head>
        <title>{configs.siteTitle}</title>
      </Head>
      <section className={utilStyles.headingMd} />
      <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
        <h2 className={utilStyles.headingLg}>{configs.siteTitle}</h2>
        <ul className={utilStyles.list}>
          {allPostsData.map(({ id, date, title }) => (
            <li className={utilStyles.listItem} key={id}>
              <Link href={`/posts/${id}`}>{title}</Link>
              <br />
              <small className={utilStyles.lightText}>
                <Date dateString={date} />
              </small>
            </li>
          ))}
        </ul>
      </section>
    </>
  </Layout>
);

export default Home;

export const getStaticProps: GetStaticProps = async () => {
  const allPostsData = getSortedPostsData();
  return {
    props: {
      allPostsData,
    },
  };
};
