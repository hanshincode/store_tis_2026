from rest_framework import permissions

class IsOwnerOrAdmin(permissions.BasePermission):
    """User chỉ xem được data của mình, Admin xem hết"""
    def has_object_permission(self, request, view, obj):
        if request.user.role in ['admin', 'super_admin']:
            return True
        return obj.user == request.user

class IsStaffSpecialist(permissions.BasePermission):
    """Staff chỉ xem được tư vấn thuộc chuyên môn """
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'super_admin' or request.user.role == 'admin':
            return True
        if request.user.role == 'staff':
            # Check logic chuyên môn
            return obj.product.category.specialization_code == request.user.specialization
        return False