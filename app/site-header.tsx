"use client";
import {usePathname} from "next/navigation";
import {Navigation} from "./navigation";
export function SiteHeader(){return <Navigation pathname={usePathname()}/>;}
