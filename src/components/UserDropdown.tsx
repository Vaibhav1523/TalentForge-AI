"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOutFromHookstep } from "@/lib/sign-out-hookstep";
import Link from "next/link";
import { User, LogOut, ChevronDown } from "lucide-react";

export function UserDropdown() {
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, []);

    if (status !== "authenticated" || !session?.user) {
        return null;
    }

    const user = session.user;
    const firstName = user.name?.split(" ")[0] || "User";
    const userImage = user.image;

    return (
        <div className="user-dropdown-container" ref={dropdownRef}>
            <button
                type="button"
                className={`user-dropdown-btn ${isOpen ? "active" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label="User menu"
            >
                <div className="user-avatar-small">
                    {userImage ? (
                        <img src={userImage} alt={firstName} />
                    ) : (
                        <User size={16} />
                    )}
                </div>
                <span className="user-name">{firstName}</span>
                <ChevronDown size={14} className={`dropdown-caret ${isOpen ? "rotate" : ""}`} />
            </button>

            {isOpen && (
                <div className="user-dropdown-menu">
                    <div className="user-dropdown-header">
                        <p className="user-dropdown-name">{user.name}</p>
                        <p className="user-dropdown-email">{user.email}</p>
                    </div>

                    <div className="user-dropdown-divider" />

                    <Link
                        href="/dashboard/profile"
                        className="user-dropdown-item"
                        onClick={() => setIsOpen(false)}
                    >
                        <User size={16} />
                        <span>Profile</span>
                    </Link>

                    <button
                        type="button"
                        className="user-dropdown-item logout"
                        onClick={() => signOutFromHookstep(session, "/")}
                    >
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
}
