function Header() {
  return (
    <div id="header" className=" h-12 flex items-center px-6 font-black rounded-lg dark:bg-opacity-5 bg-gray-100">
      <div id="logo" className="flex-1">Logo</div>
      <div id="title" className="flex-1 text-center">Visual Review</div>
      <div id="username" className="flex-1 text-right">Username</div>
    </div>
  );
}

export default Header;