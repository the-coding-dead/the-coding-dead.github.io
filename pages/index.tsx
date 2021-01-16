import { GetStaticProps } from 'next';
import Layout from '../components/layout';
import { getSortedPostsData, PostData } from '../lib/posts';
import HeadLine from '../components/headline';

const Home = ({ allPostsData }: { allPostsData: PostData[] }) => (
  <Layout>
    <section>
      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2 list-none px-0">
        {allPostsData.map((postData) => (
          <li key={postData.id}>
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
