// Saudi National Address — cities and comprehensive neighbourhoods
export const SAUDI_CITIES: Record<string, string[]> = {
  Riyadh: [
    // North & Northwest Riyadh
    'Al-Malqa','Al-Narjis','Al-Yasmin','Al-Qirawan','Al-Worood','Al-Nakheel','Al-Rawdah',
    'Hittin','Al-Ghadir','Al-Wahah','Al-Aqiq','Al-Murabba','Al-Izdihar','Al-Marwah',
    // Central & East
    'Al-Olaya','Al-Sulaymaniyah','Al-Malaz','As-Sulai','Dhahrat Al-Badiah',
    'Al-Rabwah','Al-Mansuriyah','Al-Hazm','Qurtubah','Ishbiliyah',
    'Al-Rimal','Al-Manar','Al-Masani','Al-Nahdah','Al-Khaleej','Al-Andalus',
    // South & Southwest
    'Batha','Al-Dirah','Umm Al-Hamam Al-Gharbi','Umm Al-Hamam Al-Sharqi',
    'Al-Shifa','Al-Jaradiyah','Salah Al-Din','Al-Rawabi','Al-Zahra',
    // West
    'Diplomatic Quarter','Al-Ameer Fawwaz Al-Shamal','Al-Ameer Fawwaz Al-Junub',
    // Historic
    'Diriyah','At-Turaif','Al-Murabba Al-Jadid',
  ],
  Jeddah: [
    'Al-Rawdah','Al-Zahra','Al-Hamra','Al-Corniche','Al-Shati','Al-Safa','Obhur',
    'Al-Rehab','Al-Andalus','Al-Salamah','Al-Naim','Bani Malik','Al-Murjan',
    'Al-Mishrifah','Al-Faisaliyah','Al-Waha','Al-Basateen','Al-Khalidiyah',
  ],
  Makkah: [
    'Al-Aziziyah','Al-Zahra','Al-Rusaifah','Al-Shoqiyah','Bab Al-Umrah',
    'Al-Hindawiyah','Al-Nuzha','Al-Adl','Al-Shisha','Al-Mansur',
  ],
  Madinah: [
    'Al-Aziziyah','Al-Zahra','Al-Anbariyah','Quba','Al-Rawabi',
    'Al-Haram','Wadi Al-Aqiq','Al-Ranuna','Al-Uyun','Sayed Al-Shuhada',
  ],
  Dammam: [
    'Al-Faisaliyah','Al-Noor','Al-Rakah','Al-Badiya','Al-Shulah',
    'Al-Hamra','Al-Jawharah','Al-Mazroiyah','Al-Iskan','Al-Jalawiyah',
  ],
  'Al Khobar': [
    'Al-Thuqbah','Al-Rakah','Al-Azizia','Al-Aqrabiyah','Al-Corniche',
    'Al-Ulaya','Rawdat Al-Dabbat','Al-Fakhriyah','Al-Muhammadiyah',
  ],
  Dhahran: ['Al-Iskan','Al-Aqrabiyah','Al-Faisaliyah','Al-Dana'],
  Abha:    ['Al-Naseem','Al-Nakheel','Al-Manar','Al-Andalus','Al-Manhal','Al-Rabwah'],
  AlUla:   ['Heritage District','Al-Jadidah','Al-Hijr','Dadan','Al-Ula Old Town'],
  Tabuk:   ['Al-Nakheel','Al-Rawdah','Al-Wesam','Al-Salam','Al-Aziziyah'],
  Najran:  ['Al-Rawdah','Al-Faisaliyah','Al-Nakheel','Al-Hamra'],
  Jizan:   ['Al-Corniche','Al-Rawdah','Al-Nakheel','Al-Shati'],
  Taif:    ['Al-Rawdah','Al-Nakheel','Al-Shafa','Al-Hada','Al-Murooj'],
};

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Riyadh:     { lat: 24.7136, lng: 46.6753 },
  Jeddah:     { lat: 21.5169, lng: 39.1797 },
  Makkah:     { lat: 21.3891, lng: 39.8579 },
  Madinah:    { lat: 24.5247, lng: 39.5692 },
  Dammam:     { lat: 26.4207, lng: 50.0888 },
  'Al Khobar':{ lat: 26.2794, lng: 50.2083 },
  Dhahran:    { lat: 26.2695, lng: 50.1501 },
  Abha:       { lat: 18.2164, lng: 42.5053 },
  AlUla:      { lat: 26.6195, lng: 37.9183 },
  Tabuk:      { lat: 28.3838, lng: 36.5550 },
  Najran:     { lat: 17.5656, lng: 44.2289 },
  Jizan:      { lat: 16.8894, lng: 42.5611 },
  Taif:       { lat: 21.2854, lng: 40.4159 },
};

// Per-neighbourhood GPS offsets from city centre (approximate, used for pin refinement)
export const NEIGHBOURHOOD_COORDS: Record<string, Record<string, { lat: number; lng: number }>> = {
  Riyadh: {
    'Al-Malqa':          { lat: 24.8311, lng: 46.6422 },
    'Al-Narjis':         { lat: 24.8230, lng: 46.6550 },
    'Al-Yasmin':         { lat: 24.8150, lng: 46.6680 },
    'Al-Qirawan':        { lat: 24.8094, lng: 46.6320 },
    'Hittin':            { lat: 24.7968, lng: 46.6530 },
    'Al-Olaya':          { lat: 24.6950, lng: 46.6836 },
    'Al-Malaz':          { lat: 24.6877, lng: 46.7219 },
    'Al-Nakheel':        { lat: 24.7724, lng: 46.6611 },
    'Al-Rawdah':         { lat: 24.7504, lng: 46.6722 },
    'Diriyah':           { lat: 24.7347, lng: 46.5718 },
    'Diplomatic Quarter':{ lat: 24.7042, lng: 46.6195 },
  },
};

// High-quality Unsplash property images (free, no API key needed)
export const PROPERTY_IMAGES: Record<string, string[]> = {
  APARTMENT: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=75',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=75',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=600&q=75',
  ],
  VILLA: [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=75',
    'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=600&q=75',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=600&q=75',
  ],
  CHALET: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=75',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=75',
  ],
  STUDIO: [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=600&q=75',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=600&q=75',
  ],
};
