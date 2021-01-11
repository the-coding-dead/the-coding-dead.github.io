import { GetStaticProps, GetStaticPaths } from 'next';
import Layout from '../../components/layout';
import Code from '../../components/code';
import { getAllPostIds, getPostData, PostData } from '../../lib/posts';
import Date from '../../components/date';

const Post = ({ postData }: { postData: PostData }) => (
  <Layout title={postData.title} description={postData.description}>
    <>
      <article className="container my-5 p-3 bg-gray-600 rounded">
        <h1 className="text-3xl">{postData.title}</h1>
        <div className="mb-4">
          <Date dateString={postData.date} />
        </div>
        <Code language={postData.language} code={postData.code} />
        <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
      </article>
    </>
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
