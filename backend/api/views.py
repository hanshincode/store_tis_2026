from rest_framework import viewsets, permissions, status, filters, mixins
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from django.db.models import Sum

# Import Models
from .models import (
    Product, Order, News, User, EnterpriseEmployee, 
    ConsultationRequest, ProductPackage, OrderItem, 
    Cart, CartItem
)

# Import Serializers
from .serializers import (
    ProductSerializer, OrderSerializer, EnterpriseEmployeeSerializer,
    RegisterSerializer, CartItemSerializer, OrderItemSerializer,
    ProductPackageSerializer, ConsultationRequestSerializer, NewsSerializer
)

# Import Permissions
from .permissions import IsOwnerOrAdmin

# --- AUTH VIEWSETS ---

class RegisterView(viewsets.GenericViewSet, mixins.CreateModelMixin):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class CustomLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'role': user.role,
            'email': user.email
        })

class UserViewSet(viewsets.ModelViewSet):
    """
    Quản lý User & Lấy thông tin cá nhân (me)
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        elif self.action == 'me':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

# --- BUSINESS VIEWSETS ---

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category__name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    @action(detail=False, methods=['get'])
    def featured(self, request):
        products = Product.objects.filter(is_featured=True)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


# --- SỬA LẠI HÀM CREATE ĐỂ HỖ TRỢ NHIỀU ẢNH ---
    def create(self, request, *args, **kwargs):
        # 1. Lưu thông tin cơ bản (Tên, giá, mô tả...)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()

        # 2. Xử lý Upload nhiều ảnh (Album)
        # Frontend sẽ gửi field tên là 'uploaded_images' (dạng list)
        images = request.FILES.getlist('uploaded_images')
        
        if images:
            from .models import ProductImage
            for img in images:
                ProductImage.objects.create(product=product, image=img)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'super_admin']:
            return Order.objects.all()
        return Order.objects.filter(user=user)

    @action(detail=False, methods=['post'])
    def buy_now(self, request):
        package_id = request.data.get('package_id')
        quantity = int(request.data.get('quantity', 1))
        
        try:
            package = ProductPackage.objects.get(id=package_id)
            total = package.price * quantity
            import time
            order_code = f"ORD-{int(time.time())}"
            
            order = Order.objects.create(
                user=request.user,
                total_amount=total,
                status='pending',
                code=order_code
            )
            OrderItem.objects.create(order=order, package=package, quantity=quantity)
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        except ProductPackage.DoesNotExist:
            return Response({"error": "Gói sản phẩm không tồn tại"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EnterpriseEmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return EnterpriseEmployee.objects.filter(enterprise=self.request.user)

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user)

class ConsultationRequestViewSet(viewsets.ModelViewSet):
    """
    Class này để khớp với urls.py (router.register(..., ConsultationRequestViewSet))
    """
    queryset = ConsultationRequest.objects.all()
    serializer_class = ConsultationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'staff':
            return ConsultationRequest.objects.all() 
        elif user.role == 'customer':
            return ConsultationRequest.objects.filter(user=user)
        return ConsultationRequest.objects.all()

class NewsViewSet(viewsets.ModelViewSet):
    queryset = News.objects.all()
    serializer_class = NewsSerializer
    # Cho phép Admin đăng bài (create), khách chỉ xem (list/retrieve)
    def get_permissions(self):
        if self.action in ['create', 'update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

class CartViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        items = cart.items.all()
        total_price = sum(item.package.price * item.quantity for item in items)
        return Response({
            "items": CartItemSerializer(items, many=True).data,
            "total_price": total_price,
            "total_items": items.count()
        })

    @action(detail=False, methods=['post'])
    def add(self, request):
        package_id = request.data.get('package_id')
        quantity = int(request.data.get('quantity', 1))
        cart, _ = Cart.objects.get_or_create(user=request.user)
        try:
            package = ProductPackage.objects.get(id=package_id)
            item, created = CartItem.objects.get_or_create(cart=cart, package=package)
            if not created:
                item.quantity += quantity
            item.save()
            return Response({"status": "Added to cart"})
        except ProductPackage.DoesNotExist:
             return Response({"error": "Product Package not found"}, status=404)

    @action(detail=False, methods=['post'])
    def update_item(self, request):
        item_id = request.data.get('item_id')
        quantity = int(request.data.get('quantity'))
        try:
            item = CartItem.objects.get(id=item_id, cart__user=request.user)
            if quantity <= 0:
                item.delete()
            else:
                item.quantity = quantity
                item.save()
            return Response({"status": "Cart updated"})
        except CartItem.DoesNotExist:
            return Response({"error": "Item not found"}, status=404)

class DashboardSummaryView(APIView):
    """
    APIView riêng cho Dashboard Summary để khớp với urls.py
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        total_revenue = Order.objects.filter(status='active').aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status='pending').count()
        
        # Lấy 5 đơn mới nhất
        recent_orders = Order.objects.order_by('-created_at')[:5]
        recent_orders_data = OrderSerializer(recent_orders, many=True).data

        return Response({
            "revenue": total_revenue,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "recent_orders": recent_orders_data
        })
        
        

        
from .models import Category
from .serializers import CategorySerializer

# Mở file views.py bên Backend (Django)
from rest_framework.permissions import AllowAny, IsAdminUser

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    
    # Ghi đè hàm phân quyền
    def get_permissions(self):
        # Nếu là hành động Xem danh sách (list) hoặc Xem chi tiết (retrieve) -> Mở cửa tự do
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        # Nếu là hành động Thêm/Sửa/Xóa -> Bắt buộc là Admin
        return [IsAdminUser()]