import Link from 'next/link';

const Header = () => (
  <div className="flex items-center justify-between bg-gray-800 h-14 p-3 text-3xl font-bold">
    <div className="hover:opacity-75">
      <Link href="/">The Coding Dead</Link>
    </div>
  </div>
);

export default Header;
