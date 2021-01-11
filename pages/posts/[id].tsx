import { GetStaticProps, GetStaticPaths } from 'next';
import Layout from '../../components/layout';
import Article from '../../components/article';
import { getAllPostIds, getPostData, PostData } from '../../lib/posts';

const Post = ({ postData }: { postData: PostData }) => (
  <Layout title={postData.title} description={postData.description}>
    <Article postData={postData} />
  </Layout>
);

export default Post;

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = getAllPostIds();
  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
}: {
  params: { id: string };
}) => {
  const postData = await getPostData(params.id);
  return {
    props: {
      postData,
    },
  };
};
