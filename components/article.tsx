import { PostData } from '../lib/posts';
import Code from './code';
import Date from './date';
import Pin from './pin';

const Article = ({ postData }: { postData: PostData }) => (
  <article className="relative container mt-5 p-3 bg-gray-600 rounded">
    <Pin />
    <h1 className="text-3xl mb-1">{postData.title}</h1>
    <Date dateString={postData.date} />
    <Code language={postData.language} code={postData.code} />
    <div
      className="break-words ..."
      dangerouslySetInnerHTML={{ __html: postData.contentHtml }}
    />
  </article>
);

export default Article;
