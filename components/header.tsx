import Link from 'next/link';

const Header = () => (
  <div className="flex items-center justify-start bg-gray-800 h-18 p-3">
    <div className="cursor-pointer hover:opacity-75">
      <Link href="/">
        <div>
          <p className="text-3xl font-bold ">The Coding Dead</p>
          <p className="text-xs">
            コードを窒息するほど読んで
            <br />
            スーパーエンジニアになった気になる
          </p>
        </div>
      </Link>
    </div>
  </div>
);

export default Header;
