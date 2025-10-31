import { Outlet } from "react-router";
import Header from "~/components/home/Header";

// This is the main layout for most pages
export default function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
