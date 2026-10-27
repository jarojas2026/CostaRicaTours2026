import React from 'react';
import type { Language, Currency } from '../types';
import { TravelKnowledgeHub } from './TravelKnowledgeHub';

/** Retains the existing /tools entry point and callbacks; previous UI is archived. */
export const TravelerToolkit = (props:{language:Language;currency:Currency;onOpenTripBuilder?:()=>void;onOpenLocalBuses?:()=>void}) => <TravelKnowledgeHub {...props}/>;
