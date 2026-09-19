import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  Globe, 
  Sparkles, 
  ChevronDown, 
  Mail, 
  MessageCircle, 
  LogIn, 
  LogOut, 
  Bus, 
  Menu, 
  X, 
  Compass, 
  Map, 
  MapPin,
  Coffee, 
  Bot, 
  Clock,
  ShieldCheck,
  Plane,
  Palette,
  Home,
  Calendar,
  Activity,
  Heart
} from 'lucide-react';
import { Language, Currency } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { SUPPORTED_LANGUAGES, UI_TRANSLATIONS } from '../utils/i18n';
import { CURRENCIES } from '../utils/currencies';
import { auth, signInWithGoogle, signOut } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  activeTab?: 'home' | 'tours' | 'map' | 'culture' | 'ai' | 'itinerary' | 'bookings' | 'tools' | 'flights' | 'workspace' | 'counter' | 'destinations' | 'activities' | 'about' | 'blog';