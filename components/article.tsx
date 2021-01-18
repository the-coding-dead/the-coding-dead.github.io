import Link from 'next/link';
import { PostData } from '../lib/posts';
import Code from './code';
import Date from './date';
import Pin from './pin';

const Serialization = ({ thisId, ids }: { thisId: string; ids: string[] }) => (
  <ol>
    {ids
      .map((id) => (id === thisId ? 'この記事' : id))
      .map((id) => (
        <li key={id}>
          <Link href={id}>{id}</Link>
        </li>
      ))}
  </ol>
);

const Article = ({ postData }: { postData: PostData }) => (
  <article className="relative container mt-5 p-3 bg-gray-600 rounded">
    <Pin />
    <h1 className="text-3xl mb-1">{postData.title}</h1>
    {postData.serialization !== null && postData.serialization.length !== 0 && (
      <div className="text-sm">
        <p>Related articles</p>
        <Serialization thisId={postData.title} ids={postData.serialization} />
      </div>
    )}
    <Date dateString={postData.date} />
    <Code language={postData.language} code={postData.code} />
    <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
    {postData.serialization !== null && postData.serialization.length !== 0 && (
      <div>
        <h1 className="text-3xl mb-1">Related articles</h1>
        <Serialization thisId={postData.title} ids={postData.serialization} />
      </div>
    )}
  </article>
);

export default Article;
