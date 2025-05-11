import { NavLink } from "react-router";

interface SociosNavProps {
  links: { label: string; href: string }[]; // Define the type of links prop
}

export default function SociosNav({links}: SociosNavProps) {
    return (
        <nav className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gray-100 p-6 space-y-4 overflow-y-auto">
            <ul className="space-y-2">
                {links.map((sec) => (
                    <li key={sec.href}>
                        <NavLink
                            to={sec.href}
                            end
                            className={({ isActive }) =>
                                `block px-4 py-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-200'}`
                            }
                        >
                            {sec.label}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}