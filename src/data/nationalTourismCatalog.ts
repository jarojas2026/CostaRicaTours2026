/**
 * National tourism supply taxonomy.
 *
 * This is intentionally broader than the curated Tour[] catalog. It defines the
 * marketplace coverage model so new operators, products and live inventory can
 * be onboarded without changing the UI or agent architecture.
 *
 * IMPORTANT: taxonomy coverage is not a claim that every provider/product is
 * currently onboarded or bookable. Live availability, legal status and provider
 * credentials must be verified before sale.
 */
export const NATIONAL_TOURISM_CATEGORIES = [
  "tours_and_excursions",
  "adventure_and_adrenaline",
  "nature_and_wildlife",
  "national_parks_and_protected_areas",
  "hiking_and_trekking",
  "waterfalls_and_canyons",
  "volcanoes_and_geothermal",
  "beaches_and_coastal",
  "surf_and_board_sports",
  "snorkeling_diving_and_marine",
  "whale_watching_and_marine_wildlife",
  "sport_fishing",
  "rafting_and_river_activities",
  "kayaking_and_paddle",
  "sailing_catamaran_and_boating",
  "zipline_canopy_and_aerial",
  "canyoning_and_waterfall_rappelling",
  "horseback_riding",
  "cycling_and_mountain_biking",
  "atv_4x4_and_off_road",
  "birdwatching",
  "photography_and_nature_guiding",
  "night_nature_and_nocturnal",
  "cultural_and_historical",
  "coffee_cacao_and_gastronomy",
  "rural_and_community_tourism",
  "agrotourism",
  "indigenous_and_ancestral_experiences",
  "wellness_spa_and_thermal",
  "yoga_and_retreats",
  "romance_and_honeymoon",
  "family_and_kids",
  "accessible_tourism",
  "luxury_and_vip",
  "multiday_circuits_and_packages",
  "custom_private_experiences",
  "events_conventions_and_mice",
  "cruise_and_port_services",
  "airport_and_ground_transfers",
  "shared_and_private_shuttles",
  "car_rental_and_4x4",
  "driver_and_private_transport",
  "domestic_flights_and_air_connections",
  "lodging_and_ecolodges",
  "hotels_and_resorts",
  "vacation_rentals",
  "camping_and_glamping",
  "tickets_and_attractions",
  "museums_and_cultural_venues",
  "marinas_and_nautical_services",
  "travel_support_and_concierge",
  "travel_insurance_and_assistance",
  "connectivity_sim_and_esim"
] as const;

export const NATIONAL_TOURISM_REGIONS = [
  "central_valley",
  "arenal_northern_plains",
  "monteverde_highlands",
  "guanacaste",
  "central_pacific",
  "south_pacific_osa",
  "south_caribbean",
  "turrialba_pacuare",
  "los_santos",
  "sarapiqui",
  "puntarenas_gulf",
  "golfito",
  "costa_rica_nationwide"
] as const;

export const MARKETPLACE_CATALOG_POLICY = {
  scope: "national",
  model: "open_catalog",
  curatedSeed: "100+ experiences and services, expandable without a hard product ceiling",
  providerDrivenExpansion: true,
  liveAvailabilityRequiredBeforeBooking: true,
  providerVerificationRequiredBeforeSale: true,
  supportsCustomProducts: true,
  supportsPackagesAndBundles: true,
  supportsPrivateAndGroupProducts: true,
  supportsMultidayJourneys: true,
  supportsAncillaryServices: true
} as const;

export type NationalTourismCategory = typeof NATIONAL_TOURISM_CATEGORIES[number];
export type NationalTourismRegion = typeof NATIONAL_TOURISM_REGIONS[number];
