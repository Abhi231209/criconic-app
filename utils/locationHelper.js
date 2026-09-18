// utils/locationHelper.js

/**
 * Curated list of prominent Indian cities, districts, and cricket grounds
 * to ensure instant, reliable suggestions even if Google Places API is
 * unconfigured or offline.
 */
export const POPULAR_LOCATIONS = [
  // Haryana (including Hisar)
  {
    place_id: "loc_hisar_1",
    description: "Hisar, Haryana, India",
    structured_formatting: {
      main_text: "Hisar",
      secondary_text: "Haryana, India",
    },
  },
  {
    place_id: "loc_hisar_2",
    description: "Mahabir Stadium, Hisar, Haryana, India",
    structured_formatting: {
      main_text: "Mahabir Stadium",
      secondary_text: "Hisar, Haryana, India",
    },
  },
  {
    place_id: "loc_hisar_3",
    description: "CCS HAU Sports Complex, Hisar, Haryana, India",
    structured_formatting: {
      main_text: "CCS HAU Sports Complex",
      secondary_text: "Hisar, Haryana, India",
    },
  },
  {
    place_id: "loc_hisar_4",
    description: "OP Jindal Cricket Ground, Hisar, Haryana, India",
    structured_formatting: {
      main_text: "OP Jindal Cricket Ground",
      secondary_text: "Hisar, Haryana, India",
    },
  },
  {
    place_id: "loc_hisar_5",
    description: "Hisar Cantt, Haryana, India",
    structured_formatting: {
      main_text: "Hisar Cantt",
      secondary_text: "Hisar, Haryana, India",
    },
  },
  {
    place_id: "loc_rohtak_1",
    description: "Rohtak, Haryana, India",
    structured_formatting: {
      main_text: "Rohtak",
      secondary_text: "Haryana, India",
    },
  },
  {
    place_id: "loc_gurugram_1",
    description: "Gurugram, Haryana, India",
    structured_formatting: {
      main_text: "Gurugram",
      secondary_text: "Haryana, India",
    },
  },
  {
    place_id: "loc_faridabad_1",
    description: "Nahar Singh Stadium, Faridabad, Haryana, India",
    structured_formatting: {
      main_text: "Nahar Singh Stadium",
      secondary_text: "Faridabad, Haryana, India",
    },
  },
  {
    place_id: "loc_panipat_1",
    description: "Panipat, Haryana, India",
    structured_formatting: {
      main_text: "Panipat",
      secondary_text: "Haryana, India",
    },
  },
  {
    place_id: "loc_ambala_1",
    description: "Ambala, Haryana, India",
    structured_formatting: {
      main_text: "Ambala",
      secondary_text: "Haryana, India",
    },
  },
  {
    place_id: "loc_karnal_1",
    description: "Karnal, Haryana, India",
    structured_formatting: {
      main_text: "Karnal",
      secondary_text: "Haryana, India",
    },
  },
  // Delhi NCR
  {
    place_id: "loc_delhi_1",
    description: "Arun Jaitley Stadium, New Delhi, Delhi, India",
    structured_formatting: {
      main_text: "Arun Jaitley Stadium",
      secondary_text: "New Delhi, Delhi, India",
    },
  },
  {
    place_id: "loc_delhi_2",
    description: "New Delhi, Delhi, India",
    structured_formatting: {
      main_text: "New Delhi",
      secondary_text: "Delhi, India",
    },
  },
  {
    place_id: "loc_noida_1",
    description: "Noida Cricket Stadium, Sector 21A, Noida, UP, India",
    structured_formatting: {
      main_text: "Noida Cricket Stadium",
      secondary_text: "Sector 21A, Noida, UP, India",
    },
  },
  // Punjab & Chandigarh
  {
    place_id: "loc_mohali_1",
    description: "PCA Stadium, Mohali, Punjab, India",
    structured_formatting: {
      main_text: "PCA Stadium, Mohali",
      secondary_text: "Punjab, India",
    },
  },
  {
    place_id: "loc_chandigarh_1",
    description: "Sector 16 Cricket Stadium, Chandigarh, India",
    structured_formatting: {
      main_text: "Sector 16 Stadium",
      secondary_text: "Chandigarh, India",
    },
  },
  // Maharashtra
  {
    place_id: "loc_mumbai_1",
    description: "Wankhede Stadium, Mumbai, Maharashtra, India",
    structured_formatting: {
      main_text: "Wankhede Stadium",
      secondary_text: "Churchgate, Mumbai, Maharashtra, India",
    },
  },
  {
    place_id: "loc_mumbai_2",
    description: "Mumbai, Maharashtra, India",
    structured_formatting: {
      main_text: "Mumbai",
      secondary_text: "Maharashtra, India",
    },
  },
  {
    place_id: "loc_pune_1",
    description: "MCA Stadium, Gahunje, Pune, Maharashtra, India",
    structured_formatting: {
      main_text: "MCA Stadium",
      secondary_text: "Pune, Maharashtra, India",
    },
  },
  // Karnataka
  {
    place_id: "loc_bengaluru_1",
    description: "M. Chinnaswamy Stadium, Bengaluru, Karnataka, India",
    structured_formatting: {
      main_text: "M. Chinnaswamy Stadium",
      secondary_text: "Bengaluru, Karnataka, India",
    },
  },
  {
    place_id: "loc_bengaluru_2",
    description: "Bengaluru, Karnataka, India",
    structured_formatting: {
      main_text: "Bengaluru",
      secondary_text: "Karnataka, India",
    },
  },
  // Gujarat
  {
    place_id: "loc_ahmedabad_1",
    description: "Narendra Modi Stadium, Motera, Ahmedabad, Gujarat, India",
    structured_formatting: {
      main_text: "Narendra Modi Stadium",
      secondary_text: "Ahmedabad, Gujarat, India",
    },
  },
  {
    place_id: "loc_ahmedabad_2",
    description: "Ahmedabad, Gujarat, India",
    structured_formatting: {
      main_text: "Ahmedabad",
      secondary_text: "Gujarat, India",
    },
  },
  // Tamil Nadu
  {
    place_id: "loc_chennai_1",
    description: "MA Chidambaram Stadium, Chepauk, Chennai, Tamil Nadu, India",
    structured_formatting: {
      main_text: "MA Chidambaram Stadium (Chepauk)",
      secondary_text: "Chennai, Tamil Nadu, India",
    },
  },
  // West Bengal
  {
    place_id: "loc_kolkata_1",
    description: "Eden Gardens, Kolkata, West Bengal, India",
    structured_formatting: {
      main_text: "Eden Gardens",
      secondary_text: "Kolkata, West Bengal, India",
    },
  },
  // Telangana
  {
    place_id: "loc_hyderabad_1",
    description: "Rajiv Gandhi International Cricket Stadium, Hyderabad, India",
    structured_formatting: {
      main_text: "Rajiv Gandhi International Stadium",
      secondary_text: "Uppal, Hyderabad, Telangana, India",
    },
  },
  // Rajasthan
  {
    place_id: "loc_jaipur_1",
    description: "Sawai Mansingh Stadium, Jaipur, Rajasthan, India",
    structured_formatting: {
      main_text: "Sawai Mansingh Stadium",
      secondary_text: "Jaipur, Rajasthan, India",
    },
  },
  // Uttar Pradesh
  {
    place_id: "loc_lucknow_1",
    description: "BRSABV Ekana Cricket Stadium, Lucknow, UP, India",
    structured_formatting: {
      main_text: "Ekana Cricket Stadium",
      secondary_text: "Lucknow, Uttar Pradesh, India",
    },
  },
  {
    place_id: "loc_kanpur_1",
    description: "Green Park Stadium, Kanpur, UP, India",
    structured_formatting: {
      main_text: "Green Park Stadium",
      secondary_text: "Kanpur, Uttar Pradesh, India",
    },
  },
  // Himachal Pradesh
  {
    place_id: "loc_dharamshala_1",
    description: "HPCA Stadium, Dharamshala, Himachal Pradesh, India",
    structured_formatting: {
      main_text: "HPCA Stadium",
      secondary_text: "Dharamshala, Himachal Pradesh, India",
    },
  },
  // Madhya Pradesh
  {
    place_id: "loc_indore_1",
    description: "Holkar Cricket Stadium, Indore, Madhya Pradesh, India",
    structured_formatting: {
      main_text: "Holkar Cricket Stadium",
      secondary_text: "Indore, Madhya Pradesh, India",
    },
  },
];

/**
 * Filter offline/popular locations by user search keyword
 */
export const searchFallbackLocations = (keyword = "") => {
  const q = (keyword || "").trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const matched = POPULAR_LOCATIONS.filter((item) => {
    const desc = (item.description || "").toLowerCase();
    const main = (item.structured_formatting?.main_text || "").toLowerCase();
    const sec = (item.structured_formatting?.secondary_text || "").toLowerCase();
    return desc.includes(q) || main.includes(q) || sec.includes(q);
  });

  // If user typed something specific with at least 3 letters and not found,
  // also add a custom typed suggestion so they can select it cleanly.
  if (matched.length === 0 && q.length >= 3) {
    const capitalized = keyword.trim().charAt(0).toUpperCase() + keyword.trim().slice(1);
    matched.push({
      place_id: `custom_${encodeURIComponent(q)}`,
      description: `${capitalized}, India`,
      structured_formatting: {
        main_text: capitalized,
        secondary_text: "India",
      },
    });
  }

  return matched;
};
