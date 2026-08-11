"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Menu, Bell, User, LogOut, ChevronDown, X, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { getUser, getLoginPath } from "@/lib/auth";

const menuSections = [
  {
    title: "GENERAL",
    links: [
      { href: "/", label: "Home" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "ABOUT SCHOOL",
    links: [
      { href: "/about", label: "About School" },
      { href: "/mission-vision", label: "Mission & Vision" },
      { href: "/principal-message", label: "Principal's Message" },
      { href: "/management", label: "Management" },
      { href: "/school-information", label: "School Information" },
    ],
  },
  {
    title: "ACADEMICS",
    links: [
      { href: "/curriculum", label: "Curriculum" },
      { href: "/classes-subjects", label: "Classes & Subjects" },
      { href: "/examination", label: "Examination" },
      { href: "/academic-calendar", label: "Academic Calendar" },
    ],
  },
  {
    title: "STUDENT LIFE",
    links: [
      { href: "/student-activities", label: "Student Activities" },
      { href: "/sports", label: "Sports" },
      { href: "/clubs", label: "Clubs & Co-curricular Activities" },
      { href: "/events", label: "Events" },
    ],
  },
  {
    title: "ADMISSIONS",
    links: [
      { href: "/admissions", label: "Admissions" },
      { href: "/admission-enquiry", label: "Admission Enquiry" },
      { href: "/fee-information", label: "Fee Information" },
    ],
  },
  {
    title: "NEWS & EVENTS",
    links: [
      { href: "/news", label: "News" },
      { href: "/announcements", label: "Announcements" },
      { href: "/events", label: "Events" },
    ],
  },
  {
    title: "PORTALS / LOGIN",
    links: [
      { href: "/login/student", label: "Student" },
      { href: "/login/teacher", label: "Teacher" },
      { href: "/login/management", label: "Management" },
    ],
  },
];

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [user, setUser] = useState<{ full_name: string; role?: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  const isDashboard = !!onMenuClick;

  const authPaths = ["/login", "/admin/login", "/super-admin/login"];
  const isAuthPage = pathname
    ? authPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
    : false;

  useEffect(() => {
    if (!user || isAuthPage) return;

    let cancelled = false;

    const fetchUnreadCount = async () => {
      try {
        const res = await api.get("/notifications/");
        const notifications = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) {
          setUnreadCount(notifications.filter((n: { is_read?: boolean }) => !n.is_read).length);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    };

    fetchUnreadCount();

    const handleFocus = () => {
      fetchUnreadCount();
    };
    const handleNotificationsUpdated = () => {
      fetchUnreadCount();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("notifications-updated", handleNotificationsUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("notifications-updated", handleNotificationsUpdated);
    };
  }, [user, pathname]);

  const handleLogout = async () => {
    // Capture role from localStorage BEFORE clearing auth state so we can
    // redirect to the correct role-specific login page.
    const currentUser = getUser();
    const role = currentUser?.role;
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem("user");
    window.location.href = getLoginPath(role);
  };

  const toggleSection = (title: string) => {
    setExpandedSection((prev) => (prev === title ? null : title));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      setExpandedSection(null);
    }
  }, [mobileMenuOpen]);

  if (!isDashboard && pathname?.startsWith("/dashboard")) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50" ref={menuRef}>
      <div className="h-0.5 bg-role-500/60" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={isDashboard ? onMenuClick : () => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-md text-gray-600 hover:text-gray-900 ${isDashboard ? "lg:hidden" : ""}`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link href="/" className="flex items-center">
              <div className="bg-primary-600 text-white font-bold text-xl px-3 py-1 rounded-lg">SMS</div>
              <span className="ml-2 font-semibold text-gray-900 hidden sm:block">School Management</span>
            </Link>
          </div>
          {!isAuthPage && user && (
            <div className="hidden lg:flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-primary-700 hover:text-primary-800 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/notifications"
                className="relative p-2 text-gray-600 hover:text-gray-900"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-danger-500 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline">{user.full_name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100">
                    <Link href="/dashboard/profile" className="block px-4 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50 hover:text-primary-700">
                      Profile
                    </Link>
                    <Link href="/dashboard/change-password" className="block px-4 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50 hover:text-primary-700">
                      Change Password
                    </Link>
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50 hover:text-primary-700">
                      Dashboard
                    </Link>
                    <Link href="/" className="block px-4 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50 hover:text-primary-700">
                      Home
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50 hover:text-danger-600">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-30 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="fixed top-0 left-0 z-50 h-full w-[320px] sm:w-[360px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <span className="font-semibold text-gray-900 text-lg">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-md text-gray-600 hover:text-gray-900" aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {menuSections.map((section) => (
                <div key={section.title} className="border-b border-gray-100">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                    aria-expanded={expandedSection === section.title}
                  >
                    <span>{section.title}</span>
                    <ChevronRight
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                        expandedSection === section.title ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      expandedSection === section.title ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="py-1">
                      {section.links.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-primary-600 hover:translate-x-0.5"
                        >
                          <ChevronRight className="h-3 w-3 mr-2 text-gray-400" />
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {user && (
              <div className="px-4 py-4 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex items-center px-1 text-sm font-medium text-gray-700">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="truncate">{user.full_name}</span>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center py-2.5 px-4 bg-primary-600 text-white font-medium rounded-lg transition-all duration-200 hover:bg-primary-700 hover:shadow-md active:scale-[0.98]"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg transition-all duration-200 hover:bg-gray-50"
                  >
                    Notifications
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg transition-all duration-200 hover:bg-gray-50"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/change-password"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg transition-all duration-200 hover:bg-gray-50"
                  >
                    Change Password
                  </Link>
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg transition-all duration-200 hover:bg-gray-50"
                  >
                    Home
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg transition-all duration-200 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </nav>
  );
}