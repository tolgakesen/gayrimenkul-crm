-- GayriMenkul CRM — Demo Veri (100'er kayıt)
-- Supabase Dashboard > SQL Editor'da çalıştırın

-- ─── PROPERTIES ───────────────────────────────────────────────────────────────
INSERT INTO properties (id, data)
SELECT
  'prop-' || lpad(i::text, 3, '0'),
  jsonb_build_object(
    'id',               'prop-' || lpad(i::text, 3, '0'),
    'createdAt',        (NOW() - ((i * 1.7)::int || ' days')::INTERVAL)::text,
    'updatedAt',        (NOW() - ((i * 0.3)::int || ' days')::INTERVAL)::text,
    'createdBy',        'admin-seed',
    'listingType',      CASE WHEN i % 3 = 0 THEN 'rent' ELSE 'sale' END,
    'status',           (ARRAY['active','active','active','active','sold','rented','withdrawn'])[(i % 7) + 1],
    'title',
      (ARRAY['Satılık','Satılık','Kiralık'])[(i % 3) + 1] || ' ' ||
      (ARRAY['1+1','2+1','3+1','4+1','5+1'])[(i % 5) + 1] || ' Daire, ' ||
      (ARRAY['Kadıköy','Beşiktaş','Şişli','Beyoğlu','Üsküdar','Maltepe','Kartal','Ataşehir','Sarıyer','Bakırköy','Fatih','Eyüpsultan','Bağcılar','Esenyurt','Beylikdüzü','Pendik','Tuzla'])[(i % 17) + 1],
    'price',            CASE WHEN i % 3 = 0 THEN (10000  + (i * 1730) % 80000)
                                             ELSE (1500000 + (i * 137000) % 12000000) END,
    'squareMeters',     60  + (i * 13) % 200,
    'roomCount',        (ARRAY['1+1','2+1','3+1','4+1','5+1'])[(i % 5) + 1],
    'district',         (ARRAY['Kadıköy','Beşiktaş','Şişli','Beyoğlu','Üsküdar','Maltepe','Kartal','Ataşehir','Sarıyer','Bakırköy','Fatih','Eyüpsultan','Bağcılar','Esenyurt','Beylikdüzü','Pendik','Tuzla'])[(i % 17) + 1],
    'neighborhood',     (ARRAY['Merkez','Bostancı','Fenerbahçe','Moda','Suadiye','Kozyatağı','Göztepe','Erenköy','Caddebostan','Acıbadem','Fikirtepe','Bağdat Cad.'])[(i % 12) + 1],
    'floor',            1  + (i * 3) % 15,
    'totalFloors',      5  + (i * 2) % 20,
    'buildingAge',      (i * 7) % 35,
    'heatingType',      (ARRAY['central','combi','floor','air-conditioning','stove'])[(i % 5) + 1],
    'furnishing',       (ARRAY['furnished','semi-furnished','unfurnished'])[(i % 3) + 1],
    'facadeDirection',  (ARRAY['north','south','east','west','north-east','south-west'])[(i % 6) + 1],
    'deedStatus',       (ARRAY['clean','mortgage','share','floor-easement'])[(i % 4) + 1],
    'zoningStatus',     (ARRAY['residential','commercial','mixed'])[(i % 3) + 1],
    'hasBalcony',       (i % 3 <> 0),
    'hasParking',       (i % 4 <> 0),
    'hasElevator',      (i % 2 = 0),
    'isGatedCommunity', (i % 6 = 0),
    'creditEligible',   (i % 3 <> 2),
    'hasDASK',          (i % 4 <> 3),
    'monthlyDues',      300 + (i * 120) % 3000,
    'commissionRate',   1   + (i % 3),
    'features',         '[]'::jsonb,
    'notes',            i || '. ilan. Bakımlı ve temiz, sahibe ait.',
    'owner',            jsonb_build_object(
                          'name',  (ARRAY['Ahmet Yılmaz','Fatma Kaya','Mehmet Demir','Zeynep Şahin','Ali Çelik','Ayşe Yıldız','Hasan Yıldırım','Elif Öztürk','Mustafa Arslan','Selin Doğan'])[(i % 10) + 1],
                          'phone', '05' || lpad(((i * 31 + 500000000) % 100000000)::text, 9, '0'),
                          'notes', ''
                        ),
    'lat',              40.85 + (((i * 17) % 100)::float / 500),
    'lon',              28.90 + (((i * 23) % 100)::float / 400),
    'meetingHistory',   '[]'::jsonb,
    'floorPlanPhoto',   NULL
  )
FROM generate_series(1, 100) AS i;


-- ─── CLIENTS ──────────────────────────────────────────────────────────────────
INSERT INTO clients (id, data)
SELECT
  'client-' || lpad(i::text, 3, '0'),
  jsonb_build_object(
    'id',                   'client-' || lpad(i::text, 3, '0'),
    'createdAt',            (NOW() - ((i * 1.5)::int || ' days')::INTERVAL)::text,
    'updatedAt',            (NOW() - ((i * 0.4)::int || ' days')::INTERVAL)::text,
    'createdBy',            'admin-seed',
    'firstName',            (ARRAY['Ahmet','Mehmet','Ali','Hasan','İbrahim','Mustafa','Ömer','Fatma','Ayşe','Emine','Hatice','Zeynep','Elif','Meryem','Selin','Deniz','Can','Cem','Tolga','Burak'])[(i % 20) + 1],
    'lastName',             (ARRAY['Yılmaz','Kaya','Demir','Şahin','Çelik','Yıldız','Yıldırım','Öztürk','Arslan','Doğan','Kılıç','Aslan','Çetin','Koç','Kurt','Aydın','Güneş','Polat','Erdoğan','Şimşek'])[(i % 20) + 1],
    'phone',                '05' || lpad(((i * 43 + 300000000) % 100000000)::text, 9, '0'),
    'email',                'musteri' || i || '@ornek.com',
    'occupation',           (ARRAY['Mühendis','Doktor','Avukat','Öğretmen','Esnaf','Memur','Müdür','Girişimci','Mimar','Muhasebeci'])[(i % 10) + 1],
    'birthday',             ((DATE '1970-01-01') + ((i * 137) % 18000) * INTERVAL '1 day')::date::text,
    'clientType',           (ARRAY['buyer','buyer','seller','tenant'])[(i % 4) + 1],
    'segment',              (ARRAY['hot','warm','warm','cold'])[(i % 4) + 1],
    'source',               (ARRAY['referral','website','social','ad','other'])[(i % 5) + 1],
    'pipelineStage',        (ARRAY['lead','contact','meeting','offer','contract','closed'])[(i % 6) + 1],
    'priorityLevel',        (ARRAY['high','medium','medium','low'])[(i % 4) + 1],
    'budgetMin',            500000  + (i * 75000)  % 5000000,
    'budgetMax',            1000000 + (i * 150000) % 10000000,
    'declaredIncome',       15000   + (i * 4000)   % 85000,
    'creditStatus',         (ARRAY['approved','applied','not-applied','not-eligible'])[(i % 4) + 1],
    'decisionStage',        (ARRAY['searching','decided','negotiating'])[(i % 3) + 1],
    'listingTypePreference',(ARRAY['sale','sale','rent'])[(i % 3) + 1],
    'desiredMinM2',         70  + (i * 5)  % 80,
    'desiredMaxM2',         130 + (i * 10) % 120,
    'desiredRoomCounts',    jsonb_build_array((ARRAY['2+1','3+1','4+1'])[(i % 3) + 1]),
    'desiredFeatures',      '[]'::jsonb,
    'preferredDistricts',   jsonb_build_array(
                              (ARRAY['Kadıköy','Beşiktaş','Şişli','Üsküdar','Maltepe','Ataşehir','Sarıyer','Bakırköy','Fatih','Beylikdüzü'])[(i % 10) + 1]
                            ),
    'preferredNeighborhoods','[]'::jsonb,
    'firstMeetingDate',     (NOW() - (((i * 3) % 150) || ' days')::INTERVAL)::date::text,
    'notes',                i || '. müşteri. Aktif arıyor.',
    'matchWeights',         jsonb_build_object('budget',40,'location',30,'squareMeters',15,'roomCount',10,'features',5),
    'meetingHistory',       '[]'::jsonb,
    'shownPropertyIds',     '[]'::jsonb,
    'pipelineHistory',      '[]'::jsonb,
    'noteLog',              '[]'::jsonb
  )
FROM generate_series(1, 100) AS i;


-- ─── REMINDERS ────────────────────────────────────────────────────────────────
INSERT INTO reminders (id, data)
SELECT
  'rem-' || lpad(i::text, 3, '0'),
  jsonb_build_object(
    'id',        'rem-' || lpad(i::text, 3, '0'),
    'createdAt', (NOW() - ((i * 2) % 90 || ' days')::INTERVAL)::text,
    'title',
      (ARRAY['Müşteri ara','Tapu randevusu','Keşif ziyareti','Teklif görüşmesi','Sözleşme imzası','Kredi takibi','Fotoğraf çekimi','Belge teslimi'])[(i % 8) + 1]
      || ' — ' ||
      (ARRAY['Ahmet Yılmaz','Fatma Kaya','Mehmet Demir','Zeynep Şahin','Ali Çelik','Ayşe Yıldız','Hasan Yıldırım','Elif Öztürk','Mustafa Arslan','Selin Doğan'])[(i % 10) + 1],
    'type',      (ARRAY['call','meeting','visit','followup','other'])[(i % 5) + 1],
    'dueDate',   (NOW() + ((i - 50) || ' days')::INTERVAL)::date::text,
    'status',
      CASE
        WHEN i % 7 = 0 THEN 'completed'
        WHEN (NOW() + ((i - 50) || ' days')::INTERVAL)::date < NOW()::date THEN 'overdue'
        ELSE 'pending'
      END,
    'clientId',   CASE WHEN i % 4 <> 0 THEN 'client-' || lpad(((i % 100) + 1)::text, 3, '0') ELSE NULL END,
    'propertyId', CASE WHEN i % 5 = 0  THEN 'prop-'   || lpad(((i % 100) + 1)::text, 3, '0') ELSE NULL END,
    'notes',      'Hatırlatıcı notu ' || i || '.',
    'notified',   false,
    'lastVoiceAlertAt', NULL,
    'noteLog',    '[]'::jsonb
  )
FROM generate_series(1, 100) AS i;


-- ─── ACTIVITY ─────────────────────────────────────────────────────────────────
INSERT INTO activity (id, data)
SELECT
  'act-' || lpad(i::text, 3, '0'),
  jsonb_build_object(
    'id',       'act-' || lpad(i::text, 3, '0'),
    'type',     (ARRAY['property_add','property_edit','client_add','client_edit','reminder_add','status_change'])[(i % 6) + 1],
    'title',
      (ARRAY['Yeni ilan eklendi','İlan güncellendi','Yeni müşteri eklendi','Müşteri güncellendi','Hatırlatıcı oluşturuldu','Durum değiştirildi'])[(i % 6) + 1]
      || ': Kayıt #' || i,
    'entityId', CASE WHEN i % 2 = 0
                  THEN 'prop-'   || lpad(((i % 100) + 1)::text, 3, '0')
                  ELSE 'client-' || lpad(((i % 100) + 1)::text, 3, '0')
                END,
    'date',     (NOW() - (i || ' hours')::INTERVAL)::text
  )
FROM generate_series(1, 100) AS i;
