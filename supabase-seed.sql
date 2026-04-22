-- GayriMenkul CRM — Demo Veri (encoding-safe, chr() kullaniyor)
-- Supabase Dashboard > SQL Editor > New query > Run

-- Onceki seed verisini temizle
DELETE FROM properties WHERE id LIKE 'prop-%';
DELETE FROM clients   WHERE id LIKE 'client-%';
DELETE FROM reminders WHERE id LIKE 'rem-%';
DELETE FROM activity  WHERE id LIKE 'act-%';

-- ─── PROPERTIES ───────────────────────────────────────────────────────────────
-- chr degerleri: 305=i(noktasiz) 351=s(cedilla) 350=S(cedilla) 231=c(cedilla)
--               199=C(cedilla)  287=g(breve)   252=u(umlaut)  220=U(umlaut)
--               246=o(umlaut)   214=O(umlaut)  304=I(noktalı) 286=G(breve)
WITH ch AS (
  SELECT chr(305) xi, chr(304) xib, chr(351) xs, chr(350) xsb,
         chr(231) xc, chr(199) xcb, chr(287) xg, chr(286) xgb,
         chr(252) xu, chr(220) xub, chr(246) xo, chr(214) xob
)
INSERT INTO properties (id, data)
SELECT
  'prop-' || lpad(i::text, 3, '0'),
  jsonb_build_object(
    'id',        'prop-' || lpad(i::text, 3, '0'),
    'createdAt', (NOW() - ((i*1.7)::int || ' days')::INTERVAL)::text,
    'updatedAt', (NOW() - ((i*0.3)::int || ' days')::INTERVAL)::text,
    'createdBy', 'admin-seed',
    'listingType', CASE WHEN i%3=0 THEN 'rent' ELSE 'sale' END,
    'status', (ARRAY['active','active','active','active','sold','rented','withdrawn'])[(i%7)+1],
    'title',
      CASE WHEN i%3=0
        THEN 'Kiral' || ch.xi || 'k'
        ELSE 'Sat' || ch.xi || 'l' || ch.xi || 'k'
      END || ' ' ||
      (ARRAY['1+1','2+1','3+1','4+1','5+1'])[(i%5)+1] || ' Daire, ' ||
      (ARRAY[
        'Kad' || ch.xi || 'k' || ch.xo || 'y',
        'Be' || ch.xs || 'ikta' || ch.xs,
        ch.xsb || 'i' || ch.xs || 'li',
        'Beyo' || ch.xg || 'lu',
        ch.xub || 'sk' || ch.xu || 'dar',
        'Maltepe','Kartal',
        'Ata' || ch.xs || 'ehir',
        'Sar' || ch.xi || 'yer',
        'Bak' || ch.xi || 'rk' || ch.xo || 'y',
        'Fatih',
        'Ey' || ch.xu || 'psultan',
        'Ba' || ch.xg || 'c' || ch.xi || 'lar',
        'Esenyurt',
        'Beylikd' || ch.xu || 'z' || ch.xu,
        'Pendik','Tuzla'
      ])[(i%17)+1],
    'price', CASE WHEN i%3=0
      THEN  10000 + (i*1730)%80000
      ELSE 1500000 + (i*137000)%12000000
    END,
    'squareMeters', 60 + (i*13)%200,
    'roomCount', (ARRAY['1+1','2+1','3+1','4+1','5+1'])[(i%5)+1],
    'district', (ARRAY[
      'Kad' || ch.xi || 'k' || ch.xo || 'y',
      'Be' || ch.xs || 'ikta' || ch.xs,
      ch.xsb || 'i' || ch.xs || 'li',
      'Beyo' || ch.xg || 'lu',
      ch.xub || 'sk' || ch.xu || 'dar',
      'Maltepe','Kartal',
      'Ata' || ch.xs || 'ehir',
      'Sar' || ch.xi || 'yer',
      'Bak' || ch.xi || 'rk' || ch.xo || 'y',
      'Fatih',
      'Ey' || ch.xu || 'psultan',
      'Ba' || ch.xg || 'c' || ch.xi || 'lar',
      'Esenyurt',
      'Beylikd' || ch.xu || 'z' || ch.xu,
      'Pendik','Tuzla'
    ])[(i%17)+1],
    'neighborhood', (ARRAY[
      'Merkez',
      'Bostanc' || ch.xi,
      'Fenerba' || ch.xc || 'e',
      'Moda','Suadiye',
      'Kozyata' || ch.xg || ch.xi,
      'G' || ch.xo || 'ztepe',
      'Erenk' || ch.xo || 'y',
      'Caddebostan',
      'Ac' || ch.xi || 'badem',
      'Fikirtepe',
      'Ba' || ch.xg || 'dat Cad.'
    ])[(i%12)+1],
    'floor', 1+(i*3)%15,
    'totalFloors', 5+(i*2)%20,
    'buildingAge', (i*7)%35,
    'heatingType',    (ARRAY['central','combi','floor','air-conditioning','stove'])[(i%5)+1],
    'furnishing',     (ARRAY['furnished','semi-furnished','unfurnished'])[(i%3)+1],
    'facadeDirection',(ARRAY['north','south','east','west','north-east','south-west'])[(i%6)+1],
    'deedStatus',     (ARRAY['clean','mortgage','share','floor-easement'])[(i%4)+1],
    'zoningStatus',   (ARRAY['residential','commercial','mixed'])[(i%3)+1],
    'hasBalcony',       (i%3<>0),
    'hasParking',       (i%4<>0),
    'hasElevator',      (i%2=0),
    'isGatedCommunity', (i%6=0),
    'creditEligible',   (i%3<>2),
    'hasDASK',          (i%4<>3),
    'monthlyDues',  300+(i*120)%3000,
    'commissionRate', 1+(i%3),
    'features', '[]'::jsonb,
    'notes', i || '. ilan. Bak' || ch.xi || 'ml' || ch.xi || ' ve temiz, sahibe ait.',
    'owner', jsonb_build_object(
      'name', (ARRAY[
        'Ahmet Y' || ch.xi || 'lmaz',
        'Fatma Kaya',
        'Mehmet Demir',
        'Zeynep ' || ch.xsb || 'ahin',
        'Ali '   || ch.xcb || 'elik',
        'Ay' || ch.xs || 'e Y' || ch.xi || 'ld' || ch.xi || 'z',
        'Hasan Y' || ch.xi || 'ld' || ch.xi || 'r' || ch.xi || 'm',
        'Elif ' || ch.xcb || 'etin',
        'Mustafa Arslan',
        'Selin Do' || ch.xg || 'an'
      ])[(i%10)+1],
      'phone', '05' || lpad(((i*31+500000000)%100000000)::text, 9, '0'),
      'notes', ''
    ),
    'lat', 40.85 + (((i*17)%100)::float/500),
    'lon', 28.90 + (((i*23)%100)::float/400),
    'meetingHistory', '[]'::jsonb,
    'floorPlanPhoto', NULL
  )
FROM generate_series(1,100) i, ch;


-- ─── CLIENTS ──────────────────────────────────────────────────────────────────
WITH ch AS (
  SELECT chr(305) xi, chr(304) xib, chr(351) xs, chr(350) xsb,
         chr(231) xc, chr(199) xcb, chr(287) xg, chr(286) xgb,
         chr(252) xu, chr(220) xub, chr(246) xo, chr(214) xob
)
INSERT INTO clients (id, data)
SELECT
  'client-' || lpad(i::text, 3, '0'),
  jsonb_build_object(
    'id',        'client-' || lpad(i::text, 3, '0'),
    'createdAt', (NOW() - ((i*1.5)::int || ' days')::INTERVAL)::text,
    'updatedAt', (NOW() - ((i*0.4)::int || ' days')::INTERVAL)::text,
    'createdBy', 'admin-seed',
    'firstName', (ARRAY[
      'Ahmet','Mehmet','Ali','Hasan',
      ch.xib || 'brahim',
      'Mustafa',
      ch.xob || 'mer',
      'Fatma',
      'Ay' || ch.xs || 'e',
      'Emine','Hatice','Zeynep','Elif','Meryem',
      'Selin','Deniz','Can','Cem','Tolga','Burak'
    ])[(i%20)+1],
    'lastName', (ARRAY[
      'Y' || ch.xi || 'lmaz',
      'Kaya','Demir',
      ch.xsb || 'ahin',
      ch.xcb || 'elik',
      'Y' || ch.xi || 'ld' || ch.xi || 'z',
      'Y' || ch.xi || 'ld' || ch.xi || 'r' || ch.xi || 'm',
      ch.xob || 'zt' || ch.xu || 'rk',
      'Arslan',
      'Do' || ch.xg || 'an',
      'K' || ch.xi || 'l' || ch.xi || ch.xc,
      'Aslan',
      ch.xcb || 'etin',
      'Ko' || ch.xc,
      'Kurt',
      'Ayd' || ch.xi || 'n',
      'G' || ch.xu || 'ne' || ch.xs,
      'Polat',
      'Erdo' || ch.xg || 'an',
      ch.xsb || 'im' || ch.xs || 'ek'
    ])[(i%20)+1],
    'phone', '05' || lpad(((i*43+300000000)%100000000)::text, 9, '0'),
    'email', 'musteri' || i || '@ornek.com',
    'occupation', (ARRAY[
      'M' || ch.xu || 'hendis',
      'Doktor','Avukat',
      ch.xob || ch.xg || 'retmen',
      'Esnaf','Memur',
      'M' || ch.xu || 'd' || ch.xu || 'r',
      'Giri' || ch.xs || 'imci',
      'Mimar','Muhasebeci'
    ])[(i%10)+1],
    'birthday', ((DATE '1970-01-01') + ((i*137)%18000) * INTERVAL '1 day')::date::text,
    'clientType',    (ARRAY['buyer','buyer','seller','tenant'])[(i%4)+1],
    'segment',       (ARRAY['hot','warm','warm','cold'])[(i%4)+1],
    'source',        (ARRAY['referral','website','social','ad','other'])[(i%5)+1],
    'pipelineStage', (ARRAY['lead','contact','meeting','offer','contract','closed'])[(i%6)+1],
    'priorityLevel', (ARRAY['high','medium','medium','low'])[(i%4)+1],
    'budgetMin',  500000  + (i*75000) %5000000,
    'budgetMax',  1000000 + (i*150000)%10000000,
    'declaredIncome', 15000 + (i*4000)%85000,
    'creditStatus',        (ARRAY['approved','applied','not-applied','not-eligible'])[(i%4)+1],
    'decisionStage',       (ARRAY['searching','decided','negotiating'])[(i%3)+1],
    'listingTypePreference',(ARRAY['sale','sale','rent'])[(i%3)+1],
    'desiredMinM2',  70  + (i*5) %80,
    'desiredMaxM2',  130 + (i*10)%120,
    'desiredRoomCounts',    jsonb_build_array((ARRAY['2+1','3+1','4+1'])[(i%3)+1]),
    'desiredFeatures',      '[]'::jsonb,
    'preferredDistricts',   jsonb_build_array((ARRAY[
      'Kad' || ch.xi || 'k' || ch.xo || 'y',
      'Be' || ch.xs || 'ikta' || ch.xs,
      ch.xsb || 'i' || ch.xs || 'li',
      ch.xub || 'sk' || ch.xu || 'dar',
      'Maltepe',
      'Ata' || ch.xs || 'ehir',
      'Sar' || ch.xi || 'yer',
      'Bak' || ch.xi || 'rk' || ch.xo || 'y',
      'Fatih',
      'Beylikd' || ch.xu || 'z' || ch.xu
    ])[(i%10)+1]),
    'preferredNeighborhoods','[]'::jsonb,
    'firstMeetingDate', (NOW() - (((i*3)%150) || ' days')::INTERVAL)::date::text,
    'notes', i || '. m' || ch.xu || ch.xs || 'teri. Aktif ar' || ch.xi || 'yor.',
    'matchWeights', jsonb_build_object('budget',40,'location',30,'squareMeters',15,'roomCount',10,'features',5),
    'meetingHistory',  '[]'::jsonb,
    'shownPropertyIds','[]'::jsonb,
    'pipelineHistory', '[]'::jsonb,
    'noteLog',         '[]'::jsonb
  )
FROM generate_series(1,100) i, ch;


-- ─── REMINDERS ────────────────────────────────────────────────────────────────
WITH ch AS (
  SELECT chr(305) xi, chr(304) xib, chr(351) xs, chr(350) xsb,
         chr(231) xc, chr(199) xcb, chr(287) xg, chr(286) xgb,
         chr(252) xu, chr(220) xub, chr(246) xo, chr(214) xob
)
INSERT INTO reminders (id, data)
SELECT
  'rem-' || lpad(i::text, 3, '0'),
  jsonb_build_object(
    'id',        'rem-' || lpad(i::text, 3, '0'),
    'createdAt', (NOW() - ((i*2)%90 || ' days')::INTERVAL)::text,
    'title',
      (ARRAY[
        'M' || ch.xu || ch.xs || 'teri ara',
        'Tapu randevusu',
        'Ke' || ch.xs || 'if ziyareti',
        'Teklif g' || ch.xo || 'r' || ch.xu || ch.xs || 'mesi',
        'S' || ch.xo || 'zle' || ch.xs || 'me imzas' || ch.xi,
        'Kredi takibi',
        'Foto' || ch.xg || 'raf ' || ch.xc || 'ekimi',
        'Belge teslimi'
      ])[(i%8)+1] || ' — ' ||
      (ARRAY[
        'Ahmet Y' || ch.xi || 'lmaz',
        'Fatma Kaya',
        'Mehmet Demir',
        'Zeynep ' || ch.xsb || 'ahin',
        'Ali ' || ch.xcb || 'elik',
        'Ay' || ch.xs || 'e Y' || ch.xi || 'ld' || ch.xi || 'z',
        'Hasan Y' || ch.xi || 'ld' || ch.xi || 'r' || ch.xi || 'm',
        'Elif ' || ch.xcb || 'etin',
        'Mustafa Arslan',
        'Selin Do' || ch.xg || 'an'
      ])[(i%10)+1],
    'type',    (ARRAY['call','meeting','visit','followup','other'])[(i%5)+1],
    'dueDate', (NOW() + ((i-50) || ' days')::INTERVAL)::date::text,
    'status',
      CASE
        WHEN i%7=0 THEN 'completed'
        WHEN (NOW() + ((i-50) || ' days')::INTERVAL)::date < NOW()::date THEN 'overdue'
        ELSE 'pending'
      END,
    'clientId',   CASE WHEN i%4<>0 THEN 'client-' || lpad(((i%100)+1)::text,3,'0') ELSE NULL END,
    'propertyId', CASE WHEN i%5=0  THEN 'prop-'   || lpad(((i%100)+1)::text,3,'0') ELSE NULL END,
    'notes',      'Hat' || ch.xi || 'rlat' || ch.xi || 'c' || ch.xi || ' notu ' || i || '.',
    'notified',   false,
    'lastVoiceAlertAt', NULL,
    'noteLog',    '[]'::jsonb
  )
FROM generate_series(1,100) i, ch;


-- ─── ACTIVITY ─────────────────────────────────────────────────────────────────
WITH ch AS (
  SELECT chr(305) xi, chr(304) xib, chr(351) xs, chr(350) xsb,
         chr(231) xc, chr(199) xcb, chr(287) xg, chr(286) xgb,
         chr(252) xu, chr(220) xub, chr(246) xo, chr(214) xob
)
INSERT INTO activity (id, data)
SELECT
  'act-' || lpad(i::text, 3, '0'),
  jsonb_build_object(
    'id',   'act-' || lpad(i::text, 3, '0'),
    'type', (ARRAY['property_add','property_edit','client_add','client_edit','reminder_add','status_change'])[(i%6)+1],
    'title',
      (ARRAY[
        'Yeni ilan eklendi',
        ch.xib || 'lan g' || ch.xu || 'ncellendi',
        'Yeni m' || ch.xu || ch.xs || 'teri eklendi',
        'M' || ch.xu || ch.xs || 'teri g' || ch.xu || 'ncellendi',
        'Hat' || ch.xi || 'rlat' || ch.xi || 'c' || ch.xi || ' olu' || ch.xs || 'turuldu',
        'Durum de' || ch.xg || 'i' || ch.xs || 'tirildi'
      ])[(i%6)+1] || ': Kayit #' || i,
    'entityId', CASE WHEN i%2=0
      THEN 'prop-'   || lpad(((i%100)+1)::text,3,'0')
      ELSE 'client-' || lpad(((i%100)+1)::text,3,'0')
    END,
    'date', (NOW() - (i || ' hours')::INTERVAL)::text
  )
FROM generate_series(1,100) i, ch;
