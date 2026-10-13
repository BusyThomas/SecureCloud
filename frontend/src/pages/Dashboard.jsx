import { useEffect, useState } from "react";

import {
  Bell,
  ChevronDown,
  Cloud,
  File,
  FileImage,
  FileText,
  Folder,
  HardDrive,
  Home,
  LayoutGrid,
  List,
  Moon,
  MoreVertical,
  Search,
  Share2,
  Star,
  Sun,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

const recentFiles = [
  {
    name: "Project_Report.pdf",
    type: "PDF",
    size: "2.4 MB",
    date: "Sep 23, 2026",
    icon: FileText,
  },
  {
    name: "Resume.docx",
    type: "DOCX",
    size: "1.2 MB",
    date: "Sep 22, 2026",
    icon: FileText,
  },
  {
    name: "Designs.fig",
    type: "FIG",
    size: "5.1 MB",
    date: "Sep 20, 2026",
    icon: FileImage,
  },
  {
    name: "Notes.txt",
    type: "TXT",
    size: "12 KB",
    date: "Sep 19, 2026",
    icon: File,
  },
];

const menuItems = [
  {
    label: "Home",
    icon: Home,
    active: true,
  },
  {
    label: "My Files",
    icon: Folder,
  },
  {
    label: "Shared with me",
    icon: Users,
  },
  {
    label: "Recent",
    icon: File,
  },
  {
    label: "Starred",
    icon: Star,
  },
  {
    label: "Trash",
    icon: Trash2,
  },
];

function Dashboard() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("securecloud-theme") !== "light";
  });

  useEffect(() => {
    localStorage.setItem(
      "securecloud-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-[#080d1c] text-white"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="flex min-h-screen">

        {/* =====================================================
            SIDEBAR
        ====================================================== */}

        <aside
          className={`hidden w-64 shrink-0 border-r px-4 py-6 transition-colors duration-300 md:flex md:flex-col ${
            darkMode
              ? "border-white/10 bg-[#0b1122]"
              : "border-slate-200 bg-white"
          }`}
        >

          {/* Logo */}
          <div className="mb-10 flex items-center gap-3 px-3">

            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                darkMode
                  ? "bg-blue-600"
                  : "bg-blue-600"
              }`}
            >
              <Cloud size={21} className="text-white" />
            </div>

            <span
              className={`text-lg font-semibold ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Secure
              <span className="text-blue-500">
                Cloud
              </span>
            </span>

          </div>

          {/* Navigation */}
          <nav className="space-y-2">

            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    item.active
                      ? darkMode
                        ? "bg-blue-600/20 text-blue-400"
                        : "bg-blue-50 text-blue-600"
                      : darkMode
                        ? "text-slate-400 hover:bg-white/5 hover:text-white"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon size={18} />

                  <span>
                    {item.label}
                  </span>
                </button>
              );
            })}

          </nav>

          {/* Storage */}
          <div
            className={`mt-auto rounded-2xl border p-4 transition-colors ${
              darkMode
                ? "border-white/10 bg-white/[0.03]"
                : "border-slate-200 bg-slate-50"
            }`}
          >

            <div className="mb-3 flex items-center justify-between">

              <span
                className={`text-sm ${
                  darkMode
                    ? "text-slate-300"
                    : "text-slate-600"
                }`}
              >
                Storage
              </span>

              <HardDrive
                size={16}
                className="text-blue-500"
              />

            </div>

            {/* Progress */}
            <div
              className={`mb-2 h-2 overflow-hidden rounded-full ${
                darkMode
                  ? "bg-slate-700"
                  : "bg-slate-200"
              }`}
            >
              <div className="h-full w-[16%] rounded-full bg-blue-500" />
            </div>

            <p
              className={`text-xs ${
                darkMode
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              2.4 GB of 15 GB used
            </p>

            <button
              className={`mt-4 w-full rounded-lg border py-2 text-xs font-medium transition ${
                darkMode
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                  : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              Upgrade Plan
            </button>

          </div>

        </aside>

        {/* =====================================================
            MAIN
        ====================================================== */}

        <main className="flex-1 overflow-hidden">

          {/* =================================================
              TOP BAR
          ================================================== */}

          <header
            className={`flex h-20 items-center justify-between border-b px-6 transition-colors lg:px-10 ${
              darkMode
                ? "border-white/10"
                : "border-slate-200 bg-white"
            }`}
          >

            {/* Search */}
            <div className="relative w-full max-w-md">

              <Search
                size={18}
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  darkMode
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              />

              <input
                type="text"
                placeholder="Search files, folders..."
                className={`w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none transition ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-blue-500/50"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                }`}
              />

            </div>

            {/* Right side */}
            <div className="ml-6 flex items-center gap-3">

              {/* Theme Toggle */}
              <button
                onClick={() =>
                  setDarkMode((previous) => !previous)
                }
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  darkMode
                    ? "bg-white/5 text-yellow-400 hover:bg-white/10"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                title={
                  darkMode
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {darkMode ? (
                  <Sun size={19} />
                ) : (
                  <Moon size={19} />
                )}
              </button>

              {/* Notification */}
              <button
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  darkMode
                    ? "text-slate-400 hover:bg-white/5 hover:text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Bell size={19} />

                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
              </button>

              {/* Profile */}
              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-medium text-white">
                  A
                </div>

                <span
                  className={`hidden text-sm md:block ${
                    darkMode
                      ? "text-white"
                      : "text-slate-800"
                  }`}
                >
                  User
                </span>

                <ChevronDown
                  size={16}
                  className={
                    darkMode
                      ? "text-slate-500"
                      : "text-slate-400"
                  }
                />

              </div>

            </div>

          </header>

          {/* =================================================
              PAGE CONTENT
          ================================================== */}

          <section className="p-6 lg:p-10">

            {/* =================================================
                HERO
            ================================================== */}

            <div
              className={`relative mb-8 overflow-hidden rounded-2xl border p-7 transition-colors ${
                darkMode
                  ? "border-blue-500/20 bg-gradient-to-br from-[#111c3d] via-[#101936] to-[#0c1225]"
                  : "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50"
              }`}
            >

              <div className="relative z-10 max-w-xl">

                <p className="mb-2 text-sm font-medium text-blue-500">
                  SECURE PRIVATE CLOUD
                </p>

                <h1
                  className={`text-3xl font-bold tracking-tight lg:text-4xl ${
                    darkMode
                      ? "text-white"
                      : "text-slate-900"
                  }`}
                >
                  Your Cloud.
                  <br />
                  Your Control.
                </h1>

                <p
                  className={`mt-3 max-w-md text-sm leading-6 ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Store, access and share your files
                  securely from one centralized private
                  cloud.
                </p>

                {/* Hero buttons */}
                <div className="mt-6 flex flex-wrap gap-3">

                  <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500">
                    <Upload size={17} />
                    Upload Files
                  </button>

                  <button
                    className={`flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium transition ${
                      darkMode
                        ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Folder size={17} />
                    New Folder
                  </button>

                </div>

              </div>

              {/* Decorative Cloud */}
              <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 lg:block">

                <div className="relative">

                  <Cloud
                    size={150}
                    strokeWidth={1}
                    className={
                      darkMode
                        ? "text-blue-400/30"
                        : "text-blue-500/20"
                    }
                  />

                  <div className="absolute inset-0 flex items-center justify-center">

                    <HardDrive
                      size={45}
                      className="text-blue-500"
                    />

                  </div>

                </div>

              </div>

            </div>

            {/* =================================================
                STATISTICS
            ================================================== */}

            <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">

              <StatCard
                darkMode={darkMode}
                icon={File}
                label="Total Files"
                value="24"
              />

              <StatCard
                darkMode={darkMode}
                icon={Folder}
                label="Total Folders"
                value="8"
              />

              <StatCard
                darkMode={darkMode}
                icon={Share2}
                label="Shared Files"
                value="6"
              />

              <StatCard
                darkMode={darkMode}
                icon={HardDrive}
                label="Storage Used"
                value="2.4 GB"
              />

            </div>

            {/* =================================================
                RECENT FILES
            ================================================== */}

            <div
              className={`rounded-2xl border transition-colors ${
                darkMode
                  ? "border-white/10 bg-[#0b1122]"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >

              {/* Header */}
              <div
                className={`flex items-center justify-between border-b px-5 py-5 ${
                  darkMode
                    ? "border-white/10"
                    : "border-slate-200"
                }`}
              >

                <div>

                  <h2
                    className={`font-semibold ${
                      darkMode
                        ? "text-white"
                        : "text-slate-900"
                    }`}
                  >
                    Recent Files
                  </h2>

                  <p
                    className={`mt-1 text-xs ${
                      darkMode
                        ? "text-slate-500"
                        : "text-slate-400"
                    }`}
                  >
                    Your recently accessed files
                  </p>

                </div>

                <div className="flex items-center gap-2">

                  <button
                    className={`rounded-lg p-2 transition ${
                      darkMode
                        ? "text-slate-400 hover:bg-white/5 hover:text-white"
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <LayoutGrid size={18} />
                  </button>

                  <button
                    className={`rounded-lg p-2 ${
                      darkMode
                        ? "bg-white/5 text-blue-400"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <List size={18} />
                  </button>

                  <button className="ml-2 text-sm text-blue-500 hover:text-blue-400">
                    View all →
                  </button>

                </div>

              </div>

              {/* File list */}
              <div
                className={`divide-y ${
                  darkMode
                    ? "divide-white/5"
                    : "divide-slate-100"
                }`}
              >

                {recentFiles.map((file) => {

                  const Icon = file.icon;

                  return (
                    <div
                      key={file.name}
                      className={`flex items-center gap-4 px-5 py-4 transition ${
                        darkMode
                          ? "hover:bg-white/[0.03]"
                          : "hover:bg-slate-50"
                      }`}
                    >

                      {/* File icon */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          darkMode
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        <Icon size={20} />
                      </div>

                      {/* Name */}
                      <div className="min-w-0 flex-1">

                        <p
                          className={`truncate text-sm font-medium ${
                            darkMode
                              ? "text-white"
                              : "text-slate-800"
                          }`}
                        >
                          {file.name}
                        </p>

                        <p
                          className={`mt-1 text-xs ${
                            darkMode
                              ? "text-slate-500"
                              : "text-slate-400"
                          }`}
                        >
                          {file.type}
                        </p>

                      </div>

                      {/* Size */}
                      <span
                        className={`hidden text-xs sm:block ${
                          darkMode
                            ? "text-slate-500"
                            : "text-slate-400"
                        }`}
                      >
                        {file.size}
                      </span>

                      {/* Date */}
                      <span
                        className={`hidden text-xs lg:block ${
                          darkMode
                            ? "text-slate-500"
                            : "text-slate-400"
                        }`}
                      >
                        {file.date}
                      </span>

                      {/* More */}
                      <button
                        className={`rounded-lg p-2 transition ${
                          darkMode
                            ? "text-slate-500 hover:bg-white/5 hover:text-white"
                            : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <MoreVertical size={18} />
                      </button>

                    </div>
                  );
                })}

              </div>

            </div>

          </section>

        </main>

      </div>
    </div>
  );
}


/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  darkMode,
  icon: Icon,
  label,
  value,
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        darkMode
          ? "border-white/10 bg-[#0b1122] hover:border-blue-500/20"
          : "border-slate-200 bg-white shadow-sm hover:border-blue-200"
      }`}
    >

      <div className="mb-4 flex items-center justify-between">

        <span
          className={`text-sm ${
            darkMode
              ? "text-slate-400"
              : "text-slate-500"
          }`}
        >
          {label}
        </span>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            darkMode
              ? "bg-blue-500/10 text-blue-400"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          <Icon size={18} />
        </div>

      </div>

      <p
        className={`text-2xl font-bold ${
          darkMode
            ? "text-white"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

export default Dashboard;