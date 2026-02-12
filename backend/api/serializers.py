from rest_framework import serializers
from .models import (
    User, Product, ProductImage, ProductPackage, 
    Order, OrderItem, EnterpriseEmployee, ChatMessage,
    CartItem, ConsultationRequest, News
)

# --- 1. USER & AUTH SERIALIZERS ---
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        # --- QUAN TRỌNG: Phải có 'username' và 'user_type' ở đây ---
        fields = [
            'username', 'phone', 'password', 'role', 'user_type',
            'company_name', 'tax_code', 'cccd', 'address', 
            'first_name', 'last_name', 'email'
        ]

    def create(self, validated_data):
        # Nếu frontend gửi thiếu username, ta lấy phone làm username
        if 'username' not in validated_data and 'phone' in validated_data:
            validated_data['username'] = validated_data['phone']
            
        # Tạo user với password đã mã hóa
        user = User.objects.create_user(**validated_data)
        return user

class EnterpriseEmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnterpriseEmployee
        fields = '__all__'
        read_only_fields = ['enterprise']

# --- 2. PRODUCT SERIALIZERS ---
class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['image']

class ProductPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductPackage
        fields = ['id', 'duration_label', 'price', 'duration_days']

class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    packages = ProductPackageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # LOGIC: Ẩn provider_name nếu ko phải Admin
        is_admin = request and request.user.is_authenticated and request.user.role in ['admin', 'super_admin']
        if not is_admin:
            data.pop('provider_name', None)
        return data

# --- 3. CART & ORDER SERIALIZERS ---
class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='package.product.name', read_only=True)
    price = serializers.DecimalField(source='package.price', max_digits=15, decimal_places=0, read_only=True)
    duration = serializers.CharField(source='package.duration_label', read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'package', 'product_name', 'duration', 'price', 'quantity']

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='package.product.name', read_only=True)
    duration = serializers.CharField(source='package.duration_label', read_only=True)
    price = serializers.DecimalField(source='package.price', max_digits=15, decimal_places=0, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['product_name', 'duration', 'quantity', 'price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = '__all__'

# --- 4. CHAT & NEWS SERIALIZERS ---
class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    class Meta:
        model = ChatMessage
        fields = '__all__'

class ConsultationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultationRequest
        fields = '__all__'

class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = '__all__'
    
from .models import Category

# backend/api/serializers.py
from rest_framework import serializers
from django.utils.text import slugify
from .models import Category, Product, ProductPackage, ProductImage

# Hàm tiện ích chuyển tiếng Việt có dấu thành slug không dấu
def unique_slugify(instance, value, slug_field_name='slug', queryset=None):
    slug = slugify(value) # Ví dụ: "Bảo hiểm Xe" -> "bao-hiem-xe"
    if not queryset:
        queryset = instance.__class__.objects.all()
    
    # Kiểm tra nếu đã tồn tại slug này thì thêm số vào sau
    original_slug = slug
    counter = 1
    while queryset.filter(**{slug_field_name: slug}).exists():
        if instance.pk and queryset.filter(pk=instance.pk, **{slug_field_name: slug}).exists():
            break
        slug = f"{original_slug}-{counter}"
        counter += 1
    return slug

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        extra_kwargs = {'slug': {'required': False}} # Không bắt FE gửi slug

    def create(self, validated_data):
        # Tự sinh slug từ name nếu FE không gửi hoặc gửi trống
        if 'name' in validated_data:
            instance = Category(**validated_data)
            validated_data['slug'] = unique_slugify(instance, validated_data['name'])
        return super().create(validated_data)