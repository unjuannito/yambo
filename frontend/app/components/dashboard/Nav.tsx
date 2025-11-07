import { NavLink } from "react-router";

interface SociosNavProps {
  links: { label: string; href: string, name: string }[]; // Define the type of links prop
}

export default function SociosNav({links}: SociosNavProps) {
    return (
        <nav className="hidden md:flex sticky left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gray-100 p-6 space-y-4 overflow-y-auto">
        {/*<nav className="sticky w-64 top-0 h-[calc(100vh-4rem) bg-blue-600 text-white p-4 z-10"> */}
            <ul className="space-y-2">
                {links.map((link) => (
                    <li key={link.name}>
                        <NavLink
                            to={link.href}
                            end
                            className={({ isActive }) =>
                                `block px-4 py-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-200'}`
                            }
                        >
                            {link.label}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}