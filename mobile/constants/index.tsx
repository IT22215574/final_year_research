/* eslint-disable prettier/prettier */

import home from "@/assets/icons/home.png";
import profile from "@/assets/icons/user.png";
import proposal from "@/assets/icons/wedding.png";
import search from "@/assets/icons/search.png";
import menu from "@/assets/icons/menu.png";
import chat from "@/assets/icons/chat.png";
import home_book from "@/assets/icons/home_book.png";
import home_publication from "@/assets/icons/home_publication.png";
import nav_exam from "@/assets/icons/nav_exam.png";
import nav_user from "@/assets/icons/nav_user.png";
import nav_home from "@/assets/icons/nav_home.png";

// background images
import Onboard from "@/assets/images/onboard.png";
import Onboard01 from "@/assets/images/OnBoard1.png";
 import Onboard02 from "@/assets/images/OnBoard2.png";
 import Onboard03 from "@/assets/images/OnBoard3.png";

import whatsapp from "@/assets/icons/whatsapp.png";
import phone from "@/assets/icons/phone.png";
import Home from "@/assets/icons/home1.png";
import HomeN from "@/assets/icons/home.png";
import Digital from "@/assets/icons/digital.png";
import BackArrow from "@/assets/icons/backArrow.png";
import All from "@/assets/icons/all.png";
import LandSale from "@/assets/icons/landsale.png";
import HouseSale from "@/assets/icons/housesale.png";
import Add from "@/assets/icons/add.png";
import Cat from "@/assets/icons/cat.png";
import Dist from "@/assets/icons/dist.png";
import FB from "@/assets/icons/fb.png";
import Wapp from "@/assets/icons/wapp.png";
import Acc from "@/assets/icons/acc.png";
import Terms from "@/assets/icons/terms.png";
import Safe from "@/assets/icons/safe.png";
import Pkg from "@/assets/icons/pkg.png";
import ourG from "@/assets/icons/ourG.png";
import ourP from "@/assets/icons/ourP.png";
import Duty from "@/assets/icons/duty.png";
import catside from "@/assets/icons/catside.png";
import Bug from "@/assets/icons/bug.png";
import burgermenu from "@/assets/icons/burgermenu.png";
import notification from "@/assets/icons/notification.png";

import Traingle from "@/assets/images/traingle.png";
import Vector from "@/assets/images/vector.png";
import Eclips from "@/assets/images/eclips.png";
import Traingle1 from "@/assets/images/traingle1.png";
import Vector1 from "@/assets/images/vector1.png";
import Eclips1 from "@/assets/images/eclips1.png";
import Traingle2 from "@/assets/images/traingle2.png";
import Vector2 from "@/assets/images/vector2.png";
import Eclips2 from "@/assets/images/eclips2.png";
import Icon1 from "@/assets/icons/icon1.png";
import Icon2 from "@/assets/icons/icon2.png";
import Icon3 from "@/assets/icons/icon3.png";
import Icon4 from "@/assets/icons/icon4.png";
import Icon5 from "@/assets/icons/icon5.png";
import Icon6 from "@/assets/icons/icon6.png";
import Teacher from "@/assets/icons/teacheSign.png";
import Student from "@/assets/icons/studentSign.png";
import Internal from "@/assets/icons/internal.png";
import External from "@/assets/icons/external.png";
import Email from "@/assets/icons/email.png";
import Lock from "@/assets/icons/lock.png";
import Forgot1 from "@/assets/images/forgot1.png";
import Forgot2 from "@/assets/images/forgot2.png";
import Forgot3 from "@/assets/images/forgot3.png";
import PassSucess from "@/assets/images/passsucess.png";
import Icon11 from "@/assets/icons/icon11.png";
import Icon22 from "@/assets/icons/icon22.png";
import Icon33 from "@/assets/icons/icon33.png";
import Icon44 from "@/assets/icons/icon44.png";
import Icon55 from "@/assets/icons/icon55.png";
import Icon66 from "@/assets/icons/icon66.png";
import FisherIcon from "@/assets/icons/fisherman.png";
import BuyerIcon from "@/assets/icons/buyer.png";
import heart from "@/assets/icons/heart.png";
import logout from "@/assets/icons/logout.png";
import about from "@/assets/icons/About.png";
import SFLLogo from "@/assets/images/SFLLogo.png";
import ship from "@/assets/images/ship.png";
import fish_onboard from "@/assets/images/fish_onboard.png";
import boat55FT from "@/assets/images/fishtrip/55 FEET LONG-LINE FISHING TRAWLER .png";
import boat30FT from "@/assets/images/fishtrip/ONE DAY FISHING BOAT (30FT).png";
import boatFlat from "@/assets/images/fishtrip/FLAT BOTTOM BOAT (18 12FT - 19 12FT).png";
import canoe from "@/assets/images/fishtrip/canoe.png";

export const images = {
  Onboard,
  Onboard01,
  Onboard03,
  Onboard02,
  fish_onboard,
  ship,
  boat55FT,
  boat30FT,
  boatFlat,
  canoe,
  Traingle,
  Eclips,
  Vector,
  Traingle1,
  Eclips1,
  Vector1,
  Traingle2,
  Eclips2,
  Vector2,
  Forgot1,
  Forgot2,
  Forgot3,
  PassSucess,
  SFLLogo,
};

export const icons = {
  home,
  Teacher,
  Student,
  Internal,
  External,
  Email,
  Lock,
  profile,
  proposal,
  chat,
  search,
  menu,
  Icon1,
  Icon2,
  Icon3,
  Icon4,
  Icon5,
  Icon6,
  Icon11,
  Icon22,
  Icon33,
  Icon44,
  Icon55,
  Icon66,
  FisherIcon,
  BuyerIcon,
  burgermenu,
  notification,
  whatsapp,
  phone,
  Home,
  Digital,
  BackArrow,
  All,
  LandSale,
  HouseSale,
  Dist,
  Cat,
  Add,
  FB,
  Wapp,
  Acc,
  Terms,
  Safe,
  Pkg,
  ourG,
  ourP,
  Duty,
  catside,
  HomeN,
  Bug,
  home_book,
  home_publication,
  nav_user,
  nav_exam,
  nav_home,
  heart,
  logout,
  about,
  // Convenient aliases for better code readability
  ship: ship,
  boat: ship,
  fisher: FisherIcon,
  dollar: Pkg,
  money: Pkg,
  cost: Duty,
  plus: Add,
  list: menu,
  star: heart,
  check: Icon6,
  point: Digital,
  analytics: Digital,
};

export const HEADER_GRADIENT = ["#0057FF", "#00C6FF"] as const;
// Boat Types with details
export const boatTypes = [
  {
    id: 1,
    name: "55-59.5 FT",
    size: "55-59.5 Feet",
    engineModel: "MD196TI Diesel",
    description: "Large commercial fishing vessel with powerful diesel engine",
    capacity: "6-12 people",
    fuelType: "Diesel",
    fuelEfficiency: "Low",
    engineHPOptions: [280, 300, 320, 340, 360],
    defaultEngineHP: 320,
    characteristics: [
      "Heavy-duty commercial fishing",
      "Extended offshore range",
      "Large catch capacity",
      "Stable in rough seas",
      "Multi-day operation capability",
    ],
    idealFor: "Deep sea fishing, commercial operations, large-scale fishing",
    specifications: {
      length: "55-59.5 ft",
      engine: "MD196TI Diesel",
      power: "320 HP",
      fuel: "Diesel",
    },
    image: boat55FT,
  },
  {
    id: 2,
    name: "42 FT",
    size: "42 Feet",
    engineModel: "Yanmar Diesel",
    description:
      "Mid-size commercial vessel with reliable Yanmar diesel engine",
    capacity: "4-8 people",
    fuelType: "Diesel",
    fuelEfficiency: "High",
    engineHPOptions: [45, 50, 57, 60, 65],
    defaultEngineHP: 57,
    characteristics: [
      "Fuel-efficient diesel engine",
      "Moderate catch capacity",
      "Good for multi-day trips",
      "Reliable Yanmar performance",
      "Cost-effective operation",
    ],
    idealFor: "Medium-range fishing, overnight trips, commercial fishing",
    specifications: {
      length: "42 ft",
      engine: "Yanmar Diesel",
      power: "57 HP",
      fuel: "Diesel",
    },
    image: ship,
  },
  {
    id: 3,
    name: "30 FT",
    size: "30 Feet",
    engineModel: "Yamaha Enduro",
    description: "Versatile mid-size boat with Yamaha Enduro outboard",
    capacity: "3-6 people",
    fuelType: "Gasoline",
    fuelEfficiency: "Medium",
    engineHPOptions: [30, 35, 40, 45, 50],
    defaultEngineHP: 40,
    characteristics: [
      "Reliable Yamaha outboard",
      "Good maneuverability",
      "Suitable for day trips",
      "Moderate fuel consumption",
      "Easy maintenance",
    ],
    idealFor: "Day fishing, coastal waters, medium catch capacity",
    specifications: {
      length: "30 ft",
      engine: "Yamaha Enduro",
      power: "40 HP",
      fuel: "Gasoline",
    },
    image: boat30FT,
  },
  {
    id: 4,
    name: "18-19.5 FT Flat",
    size: "18-19.5 Feet",
    engineModel: "Yamaha/Tohatsu",
    description:
      "Small flat-bottom boat ideal for shallow waters and coastal fishing",
    capacity: "2-4 people",
    fuelType: "Gasoline",
    fuelEfficiency: "High",
    engineHPOptions: [15, 18, 20, 22, 25],
    defaultEngineHP: 20,
    characteristics: [
      "Shallow water capability",
      "Low fuel consumption",
      "Easy to transport",
      "Quick deployment",
      "Excellent for coastal areas",
    ],
    idealFor: "Day trips, coastal fishing, shallow waters, small catch",
    specifications: {
      length: "18-19.5 ft",
      engine: "Yamaha/Tohatsu",
      power: "15-25 HP",
      fuel: "Gasoline",
    },
    image: boatFlat,
  },
  {
    id: 5,
    name: "Canoes/Wallam",
    size: "Small Traditional",
    engineModel: "Yamaha",
    description: "Traditional small boats with Yamaha outboard engines",
    capacity: "1-3 people",
    fuelType: "Gasoline",
    fuelEfficiency: "Very High",
    engineHPOptions: [9.9, 12, 15],
    defaultEngineHP: 12,
    characteristics: [
      "Minimal fuel consumption",
      "Easy to handle",
      "Perfect for lagoons",
      "Low maintenance",
      "Economical operation",
    ],
    idealFor: "Lagoon fishing, small-scale fishing, calm waters",
    specifications: {
      length: "Small",
      engine: "Yamaha",
      power: "9.9-15 HP",
      fuel: "Gasoline",
    },
    image: canoe,
  },
];

