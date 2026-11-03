import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, CarFront, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clapperboard, Copy, Download, ExternalLink, FileVideo2, ImagePlus,
  LayoutDashboard, LifeBuoy, LoaderCircle, Megaphone, MessageSquare, MoreVertical,
  Music2, Pause, Play, Plus, Save, Settings, Trash2, Upload, Wallet, X,
} from "lucide-react";
import logo from "./assets/onlycars-mark.webp";
import { getProject, listProjects, removeProject, saveProject } from "./storage.js";
import { createProjectVideo, MUSIC_TRACKS, previewMusic } from "./video.js";

const CTA_PRESETS = ["시승 예약하기", "이 차량 문의하기", "견적 요청하기", "방문 예약하기"];
const CURRENCIES = [
  ["EUR", "유로"], ["CHF", "스위스 프랑"], ["GBP", "영국 파운드"], ["USD", "미국 달러"],
  ["DKK", "덴마크 크로네"], ["NOK", "노르웨이 크로네"], ["SEK", "스웨덴 크로나"],
  ["PLN", "폴란드 즈워티"], ["CZK", "체코 코루나"], ["HUF", "헝가리 포린트"],
  ["RON", "루마니아 레우"], ["ISK", "아이슬란드 크로나"], ["ALL", "알바니아 렉"],
  ["BAM", "보스니아 마르크"], ["MKD", "마케도니아 데나르"], ["RSD", "세르비아 디나르"],
  ["MDL", "몰도바 레우"], ["UAH", "우크라이나 흐리우냐"], ["TRY", "튀르키예 리라"],
  ["GEL", "조지아 라리"], ["AMD", "아르메니아 드람"], ["AZN", "아제르바이잔 마나트"],
  ["BYN", "벨라루스 루블"], ["RUB", "러시아 루블"], ["KZT", "카자흐스탄 텡게"],
  ["GIP", "지브롤터 파운드"], ["KRW", "대한민국 원"],
];
const DEFAULT_VEHICLE = {
  make: "", model: "", internalId: "", year: "", mileage: "", price: "", currency: "EUR",
  format: "9:16", description: "", callToAction: "", callToActionUrl: "",
};
const DEFAULT_SETTINGS = {
  template: "classic", format: "9:16", motion: "smooth", musicStyle: "luxury", musicTrack: "auto",
};

function readRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash === "new") return { type: "new" };
  if (hash === "dashboard") return { type: "dashboard" };
  const match = hash.match(/^project\/([^/]+)(?:\/(images|edit|video|details))?$/);
  if (!match) return { type: "new" };
  const panel = match[2] || "edit";
  return { type: panel === "images" ? "images" : panel === "video" ? "video" : panel === "details" ? "details" : "edit", id: match[1] };
}

function idForRoute(route) {
  if (route.type === "new") return "#new";
  if (route.type === "dashboard") return "#dashboard";
  if (route.type === "images") return `#project/${route.id}/images`;
  if (route.type === "video") return `#project/${route.id}/video`;
  if (route.type === "details") return `#project/${route.id}/details`;
  return `#project/${route.id}/edit`;
}

function prettyPrice(vehicle) {
  if (!vehicle?.price) return "";
  const symbols = { EUR: "€", GBP: "£", USD: "$", CHF: "CHF", KRW: "₩", JPY: "¥" };
  const symbol = symbols[vehicle.currency];
  const amount = Number(String(vehicle.price).replace(/[^\d.]/g, ""));
  const formatted = Number.isFinite(amount) ? amount.toLocaleString("ko-KR", { maximumFractionDigits: 0 }) : vehicle.price;
  return symbol ? `${symbol}${formatted}` : `${formatted} ${vehicle.currency}`;
}

function useObjectUrls(records = []) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const next = records.map(record => URL.createObjectURL(record.blob));
    setUrls(next);
    return () => next.forEach(url => URL.revokeObjectURL(url));
  }, [records]);
  return urls;
}

function Sidebar({ route, onNavigate }) {
  const items = [
    { label: "대시보드", icon: LayoutDashboard, type: "dashboard" },
    { label: "새 영상", icon: Clapperboard, type: "new" },
    { label: "문의", icon: MessageSquare, type: "leads" },
    { label: "영상 크레딧", icon: Wallet, type: "credits" },
    { label: "프로필", icon: Settings, type: "profile"