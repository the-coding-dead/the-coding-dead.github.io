import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import remark from 'remark';
import html from 'remark-html';
import prism from 'remark-prism';

const postsDirectory = path.join(process.cwd(), 'posts');
const codesDirectory = path.join(process.cwd(), 'public/codes');

const extensions = {
  python: 'py',
  go: 'go',
  c: 'c',
};

export type PostData = {
  id: string;
  code: string;
  language: string;

  contentHtml: string;

  title?: string;
  date?: string;
  description?: string;
  serialization?: string[];
};

const getPostCode = (id: string, language: string) => {
  const fullPath = path.join(codesDirectory, `${id}.${extensions[language]}`);
  return fs.readFileSync(fullPath, 'utf8');
};

export const getSortedPostsData = () => {
  // Get file names under /posts
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames.map((fileName) => {
    // Remove ".md" from file name to get id
    const id = fileName.replace(/\.md$/, '');

    // Read markdown file as string
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    const { language } = matterResult.data;
    const code = getPostCode(id, language);

    // Combine the data with the id
    return {
      id,
      code,
      language,
      ...matterResult.data,
    };
  });
  // Sort posts by date
  return allPostsData.sort((a: PostData, b: PostData) => {
    if (a.date < b.date) {
      return 1;
    }
    return -1;
  });
};

export const getAllPostIds = () => {
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames.map((fileName) => ({
    params: {
      id: fileName.replace(/\.md$/, ''),
    },
  }));
};

export const getPostData = async (id: string): Promise<PostData> => {
  const fullPath = path.join(postsDirectory, `${id}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  // Use gray-matter to parse the post metadata section
  const matterResult = matter(fileContents);

  // Use remark to convert markdown into HTML string
  const processedContent = await remark()
    .use(html)
    .use(prism)
    .process(matterResult.content);
  const contentHtml = processedContent.toString();

  // Parse code
  const { language } = matterResult.data;
  const code = getPostCode(id, language);

  // Combine the data with the id and contentHtml
  return {
    id,
    code,
    language,
    contentHtml,
    ...matterResult.data,
  };
};
