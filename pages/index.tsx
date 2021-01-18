import { GetStaticProps } from 'next';
import Layout from '../components/layout';
import { getSortedPostsData, PostData } from '../lib/posts';
import HeadLine from '../components/headline';

const Home = ({ allPostsData }: { allPostsData: PostData[] }) => (
  <Layout>
    <section>
      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4 list-none px-0">
        {allPostsData.map((postData) => (
          <li className="lg:h-96 m-0" key={postData.id}>
            <HeadLine postData={postData} />
          </li>
        ))}
      </ul>
    </section>
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
