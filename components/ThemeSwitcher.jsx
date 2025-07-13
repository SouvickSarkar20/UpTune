import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  const isDark = theme === "dark";
  //theme is a variable in useTheme hook object which tells us which theme is currently being used
  //dark,light or system
  //here if the theme is dark then isDark will store  true else false

  useEffect(() => {
    setIsMounted(true);
  }, []);
  //this is done to avoid hydration problems
  //nextjs is using server-side-rendering so it will sent the built it html but at the server we do not have localstorage to store the theme value soo it will store undefined
  //but when it gets loaded in the browser with JS then there might be a mismatch with the theme value as here in the localstorage it will be set with somethign
  //to avoid this problem we will reload or rerender the page again in the browser

  if (!isMounted) return null;

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      className="hover:bg-transparent"
      onClick={toggleTheme}
      variant="ghost"
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
