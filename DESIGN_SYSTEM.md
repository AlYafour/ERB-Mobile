# Design System Guide

## نظم التصميم الموحد - Premium UI System

هذا الدليل يوضح نظام التصميم الموحد المستخدم في التطبيق لضمان تناسق ووضوح الواجهة.

## المبادئ الأساسية

1. **التناسق**: كل العناصر تتبع نفس القواعد
2. **الوضوح**: المسافات والأحجام واضحة ومحددة
3. **البساطة**: تصميم نظيف بدون تعقيد
4. **الاحترافية**: مظهر فخم ومرتاح للعين

## Spacing System

استخدم `Spacing` من `@/constants/spacing`:

```typescript
import { Spacing } from '@/constants/spacing';

// المسافات المتاحة:
Spacing.xs   // 4px
Spacing.sm   // 8px
Spacing.md   // 16px
Spacing.lg   // 24px
Spacing.xl   // 32px
Spacing.xxl  // 48px
```

## Layout Constants

استخدم `Layout` من `@/constants/layout`:

```typescript
import { Layout } from '@/constants/layout';

// المسافات الثابتة:
Layout.screenPadding      // 16px - padding للشاشات
Layout.cardPadding        // 20px - padding للكروت
Layout.cardMarginBottom   // 16px - margin bottom للكروت
Layout.sectionMarginTop   // 24px - margin top للأقسام
Layout.formGroupMarginBottom // 20px - margin bottom لمجموعات النماذج
```

## Typography

استخدم `Typography` من `@/constants/spacing`:

```typescript
import { Typography } from '@/constants/spacing';

// الأحجام:
Typography.sizes.xs    // 10px
Typography.sizes.sm    // 12px
Typography.sizes.base  // 14px
Typography.sizes.md    // 16px
Typography.sizes.lg    // 18px
Typography.sizes.xl    // 20px
Typography.sizes['2xl'] // 24px
Typography.sizes['3xl'] // 28px
Typography.sizes['4xl'] // 32px

// الأوزان:
Typography.weights.normal    // 400
Typography.weights.medium   // 500
Typography.weights.semibold  // 600
Typography.weights.bold      // 700
```

## Colors

استخدم `Colors` من `@/constants/theme`:

```typescript
import { Colors } from '@/constants/theme';

// الألوان الأساسية:
Colors.light.text
Colors.light.textSecondary
Colors.light.textTertiary
Colors.light.background
Colors.light.backgroundSecondary
Colors.light.backgroundTertiary
Colors.light.border
Colors.light.borderLight
Colors.light.tint
Colors.light.success
Colors.light.error
Colors.light.warning
Colors.light.info
```

## Components

### Button

```typescript
<Button
  title="Click Me"
  variant="primary" // primary | secondary | outline | danger
  onPress={handlePress}
  disabled={false}
  loading={false}
  fullWidth={false}
/>
```

**المواصفات:**
- الارتفاع: 48px
- Padding: 12px vertical, 24px horizontal
- Border Radius: 8px
- Font Size: 16px
- Font Weight: 600

### Card

```typescript
<Card padding={20} style={customStyle}>
  {/* Content */}
</Card>
```

**المواصفات:**
- Padding الافتراضي: 20px
- Border Radius: 12px
- Margin Bottom: 16px
- Border: 1px solid
- Shadow: خفيف

### Input

```typescript
<Input
  label="Label"
  placeholder="Placeholder"
  value={value}
  onChangeText={setValue}
  error={error}
/>
```

**المواصفات:**
- الارتفاع: 48px
- Padding: 12px vertical, 16px horizontal
- Border Radius: 8px
- Border Width: 1.5px
- Font Size: 16px

## Best Practices

### 1. المسافات

✅ **صحيح:**
```typescript
<View style={{ padding: Layout.screenPadding }}>
  <Card style={{ marginBottom: Layout.cardMarginBottom }}>
    {/* Content */}
  </Card>
</View>
```

❌ **خطأ:**
```typescript
<View style={{ padding: 15 }}>
  <Card style={{ marginBottom: 10 }}>
    {/* Content */}
  </Card>
</View>
```

### 2. الألوان

✅ **صحيح:**
```typescript
<ThemedText style={{ color: Colors.light.textSecondary }}>
  Secondary Text
</ThemedText>
```

❌ **خطأ:**
```typescript
<ThemedText style={{ color: '#999' }}>
  Secondary Text
</ThemedText>
```

### 3. Typography

✅ **صحيح:**
```typescript
<ThemedText style={{
  fontSize: Typography.sizes.lg,
  fontWeight: Typography.weights.semibold,
}}>
  Title
</ThemedText>
```

❌ **خطأ:**
```typescript
<ThemedText style={{
  fontSize: 18,
  fontWeight: '600',
}}>
  Title
</ThemedText>
```

### 4. التنظيم

- استخدم `Layout.screenPadding` لـ padding الشاشات
- استخدم `Layout.cardMarginBottom` بين الكروت
- استخدم `Spacing.md` (16px) كمسافة أساسية بين العناصر
- استخدم `Spacing.sm` (8px) للمسافات الصغيرة
- استخدم `Spacing.lg` (24px) للمسافات الكبيرة

### 5. Alignment

- تأكد من أن كل العناصر في محاذاة صحيحة
- استخدم `flexDirection: 'row'` مع `alignItems: 'center'` للعناصر الأفقية
- استخدم `justifyContent: 'space-between'` لتوزيع العناصر

## Checklist للشاشات الجديدة

- [ ] استخدام `Layout.screenPadding` للـ padding
- [ ] استخدام `Spacing` constants للمسافات
- [ ] استخدام `Typography` constants للنصوص
- [ ] استخدام `Colors` constants للألوان
- [ ] التأكد من أن الأزرار 48px ارتفاع
- [ ] التأكد من أن الـ Cards لها padding 20px
- [ ] التأكد من أن الـ Inputs لها ارتفاع 48px
- [ ] التأكد من عدم وجود تداخل في العناصر
- [ ] التأكد من أن المسافات متسقة

