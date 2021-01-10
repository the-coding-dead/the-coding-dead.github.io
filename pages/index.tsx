import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/layout';
import configs from '../lib/configs';
import { getSortedPostsData, PostData } from '../lib/posts';
import Date from '../components/date';

const Home = ({ allPostsData }: { allPostsData: PostData[] }) => (
  <Layout home>
    <>
      <Head>
        <title>{configs.siteTitle}</title>
      </Head>
      <section className="">
        <h2 className="text-4xl tracking-tight font-extrabold">{configs.siteTitle}</h2>
        <ul className="mt-2">
          {allPostsData.map(({ id, date, title }) => (
            <li className="" key={id}>
              <div className="text-3xl">
                {' '}
                <Link href={`/posts/${id}`}>{title}</Link>
                {' '}
              </div>
              <small className="">
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
