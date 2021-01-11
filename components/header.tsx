import Link from 'next/link';

const Header = () => (
  <div className="bg-gray-800 h-14 p-3">
    <div className="text-3xl hover:opacity-75">
      <Link href="/"> The Coding Dead </Link>
    </div>
  </div>
);

export default Header;
