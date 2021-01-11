import { Prism } from 'react-syntax-highlighter';
import duotoneSea from 'react-syntax-highlighter/dist/cjs/styles/prism/duotone-sea';

const Code = ({ code, language }: { language: string; code: string }) => (
  <Prism language={language} style={duotoneSea} className="my-0 p-0">
    {code}
  </Prism>
);

export default Code;
