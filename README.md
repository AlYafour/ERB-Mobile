# ERB Mobile App - Procurement Management

تطبيق موبايل لإدارة المشتريات مبني بـ React Native و Expo.

## المميزات

- ✅ Authentication (Login/Register)
- ✅ Dashboard مع إحصائيات سريعة
- ✅ إدارة المستخدمين
- ✅ إدارة الموردين
- ✅ إدارة المنتجات
- ✅ إدارة المشاريع
- ✅ طلبات الشراء
- ✅ عروض الأسعار
- ✅ طلبات العروض
- ✅ أوامر الشراء
- ✅ فواتير الشراء
- ✅ استلام البضائع
- ✅ الإشعارات
- ✅ الملف الشخصي والإعدادات

## البنية

```
erb-mobile/
├── app/                    # الشاشات (Expo Router)
│   ├── (tabs)/            # Tab Navigation
│   │   ├── index.tsx      # Dashboard
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── dashboard.tsx
│   ├── users.tsx
│   ├── suppliers.tsx
│   ├── products.tsx
│   ├── projects.tsx
│   ├── purchase-requests.tsx
│   ├── purchase-quotations.tsx
│   ├── quotation-requests.tsx
│   ├── purchase-orders.tsx
│   ├── purchase-invoices.tsx
│   ├── goods-receiving.tsx
│   ├── notifications.tsx
│   ├── profile.tsx
│   └── settings.tsx
├── components/             # UI Components
│   ├── ui/                # UI Kit
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
├── contexts/              # React Contexts
│   └── AuthContext.tsx
├── lib/                   # API & Logic
│   └── api.ts
├── constants/             # Constants
│   ├── api.ts
│   └── theme.ts
└── types/                 # TypeScript Types
    └── index.ts
```

## التثبيت

```bash
# تثبيت المكتبات
npm install

# أو
yarn install
```

## التشغيل

```bash
# تشغيل التطبيق
npm start

# تشغيل على Android
npm run android

# تشغيل على iOS
npm run ios

# تشغيل على Web
npm run web
```

## API Configuration

التطبيق متصل بـ Backend على:
- **URL**: يأتي من `EXPO_PUBLIC_API_URL` (ملف `eas.json`)، والافتراضي عند `expo start`:
  `https://procurement-backend-production-184f.up.railway.app` (انظر `constants/api.ts`)

جميع الـ endpoints موجودة في `constants/api.ts`

## Authentication

التطبيق يستخدم JWT tokens للـ authentication:
- **Access & Refresh Tokens**: مخزَّنة في **SecureStore** (Keychain/Keystore) عبر `lib/secure-storage.ts` — وليست في AsyncStorage. يوجد ترحيل تلقائي لمرة واحدة من التخزين القديم مع حذف النسخة النصية بعده.
- Refresh Token: يُستخدم تلقائياً عند انتهاء Access Token (تدوير رموز مع single-flight في `lib/api.ts`).
- User/Branding Cache (بيانات غير حساسة): يُسمح بتخزينها في AsyncStorage فقط.

> ⚠️ لا تُخزّن أي رموز أو بيانات حساسة في AsyncStorage — استخدم `lib/secure-storage.ts` دائماً.

## Navigation

- **Expo Router**: File-based routing
- **Tabs**: Dashboard, Notifications, Profile
- **Stack Navigation**: لجميع الشاشات الأخرى

## UI Components

### Button
```tsx
<Button
  title="Click Me"
  onPress={() => {}}
  variant="primary" // primary | secondary | outline | danger
  loading={false}
  fullWidth
/>
```

### Input
```tsx
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter email"
  error={error}
/>
```

### Card
```tsx
<Card>
  <Text>Content</Text>
</Card>
```

## الشاشات

### Public Screens
- `/login` - تسجيل الدخول
- `/register` - إنشاء حساب

### Protected Screens
- `/(tabs)` - Dashboard (Tab Navigation)
- `/users` - إدارة المستخدمين
- `/suppliers` - إدارة الموردين
- `/products` - إدارة المنتجات
- `/projects` - إدارة المشاريع
- `/purchase-requests` - طلبات الشراء
- `/purchase-quotations` - عروض الأسعار
- `/quotation-requests` - طلبات العروض
- `/purchase-orders` - أوامر الشراء
- `/purchase-invoices` - فواتير الشراء
- `/goods-receiving` - استلام البضائع
- `/notifications` - الإشعارات
- `/profile` - الملف الشخصي
- `/settings` - الإعدادات

## المهام المتبقية

- [ ] إضافة Pull-to-Refresh في جميع الشاشات ✅
- [ ] إضافة Search functionality ✅
- [ ] إضافة Detail screens لكل عنصر
- [ ] إضافة Create/Edit forms
- [ ] إضافة Error handling محسّن
- [ ] إضافة Loading states
- [ ] إضافة Offline support
- [ ] إضافة Push notifications

## التطوير

المشروع مبني باستخدام:
- **React Native** 0.81.5
- **Expo** ~54.0.29
- **Expo Router** ~6.0.20
- **TypeScript** 5.9.2

## License

Private
