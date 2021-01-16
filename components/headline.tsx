import Link from 'next/link';
import { PostData } from '../lib/posts';
import Code from './code';
import Date from './date';
import Pin from './pin';

const HeadLine = ({ postData }: { postData: PostData }) => (
  <Link href={`/posts/${postData.id}`}>
    <div className="my-5 hover:opacity-75 bg-gray-600 rounded relative lg:h-96 cursor-pointer">
      <Pin />
      <div className="my-0 pt-6">
        <Code language={postData.language} code={postData.code} />
      </div>
      <div className="px-3 pb-3 lg:absolute lg:bottom-0 lg:left-0">
        <p className="text-2xl mb-2">{postData.title}</p>
        <p className="text-sm">{postData.description}</p>
        <p className="text-xs">
          <Date dateString={postData.date} />
        </p>
      </div>
    </div>
  </Link>
);

export default HeadLine;
