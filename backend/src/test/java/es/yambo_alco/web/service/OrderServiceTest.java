package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.OrderProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderProductRepository orderProductRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private AuthService authService;

    @InjectMocks
    private OrderService orderService;

    @Test
    void createOrder_WhenNoProducts_ShouldThrowException() {
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.createOrder(1001, List.of()));
        assertEquals("Order must contain at least one product", exception.getMessage());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void createOrder_WhenProductMissing_ShouldThrowException() {
        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD404")
                .quantity(1)
                .price(BigDecimal.TEN)
                .configuration("{}")
                .build();

        when(productRepository.findById("PROD404")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> orderService.createOrder(1001, List.of(orderProduct)));
        assertEquals("Product not found: PROD404", exception.getMessage());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void createOrder_WhenValid_ShouldCreateOrderAndProducts() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of())
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(BigDecimal.TEN)
                .familyProduct(null) // No family = accessible to all
                .build();

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(2)
                .price(BigDecimal.TEN)
                .configuration("{}")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        Order result = orderService.createOrder(1001, List.of(orderProduct));

        assertEquals("ORD001", result.getId());
        verify(orderRepository).save(any(Order.class));

        ArgumentCaptor<OrderProduct> captor = ArgumentCaptor.forClass(OrderProduct.class);
        verify(orderProductRepository).save(captor.capture());
        assertEquals("ORD001", captor.getValue().getOrderId());
    }

    @Test
    void createOrder_WhenProductExpired_ShouldThrowException() {
        Profile profile = Profile.builder()
                .id("PROFILE001")
                .name("Premium")
                .build();

        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of(profile))
                .build();

        FamilyProduct family = FamilyProduct.builder()
                .id("FAMILY001")
                .name("Test Family")
                .startTms(LocalDateTime.now().minusDays(10))
                .endTms(LocalDateTime.now().minusDays(1)) // Expired
                .profile(profile)
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(BigDecimal.TEN)
                .familyProduct(family)
                .build();

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.TEN)
                .configuration("{}")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.createOrder(1001, List.of(orderProduct)));
        assertTrue(exception.getMessage().contains("no longer available"));
    }

    @Test
    void createOrder_WhenProductNotYetAvailable_ShouldThrowException() {
        Profile profile = Profile.builder()
                .id("PROFILE001")
                .name("Premium")
                .build();

        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of(profile))
                .build();

        FamilyProduct family = FamilyProduct.builder()
                .id("FAMILY001")
                .name("Test Family")
                .startTms(LocalDateTime.now().plusDays(1)) // Not yet available
                .endTms(LocalDateTime.now().plusDays(10))
                .profile(profile)
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(BigDecimal.TEN)
                .familyProduct(family)
                .build();

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.TEN)
                .configuration("{}")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.createOrder(1001, List.of(orderProduct)));
        assertTrue(exception.getMessage().contains("not yet available"));
    }

    @Test
    void createOrder_WhenUserLacksRequiredProfile_ShouldThrowException() {
        Profile requiredProfile = Profile.builder()
                .id("PROFILE001")
                .name("Premium")
                .build();

        Profile userProfile = Profile.builder()
                .id("PROFILE002")
                .name("Basic")
                .build();

        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of(userProfile))
                .build();

        FamilyProduct family = FamilyProduct.builder()
                .id("FAMILY001")
                .name("Test Family")
                .startTms(LocalDateTime.now().minusDays(1))
                .endTms(LocalDateTime.now().plusDays(10))
                .profile(requiredProfile)
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(BigDecimal.TEN)
                .familyProduct(family)
                .build();

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.TEN)
                .configuration("{}")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.createOrder(1001, List.of(orderProduct)));
        assertTrue(exception.getMessage().contains("don't have access"));
        assertTrue(exception.getMessage().contains("Required profile: Premium"));
    }

    @Test
    void createOrder_WhenUserHasRequiredProfileAndTimeValid_ShouldCreateOrder() {
        Profile profile = Profile.builder()
                .id("PROFILE001")
                .name("Premium")
                .build();

        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of(profile))
                .build();

        FamilyProduct family = FamilyProduct.builder()
                .id("FAMILY001")
                .name("Test Family")
                .startTms(LocalDateTime.now().minusDays(1))
                .endTms(LocalDateTime.now().plusDays(10))
                .profile(profile)
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(BigDecimal.TEN)
                .familyProduct(family)
                .build();

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.TEN)
                .configuration("{}")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        Order result = orderService.createOrder(1001, List.of(orderProduct));

        assertEquals("ORD001", result.getId());
        verify(orderRepository).save(any(Order.class));
        verify(orderProductRepository).save(any(OrderProduct.class));
    }

    @Test
    void getOrderById_WhenMissing_ShouldThrowException() {
        when(orderRepository.findById("ORD404")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> orderService.getOrderById("ORD404"));
        assertEquals("Order not found", exception.getMessage());
    }

    @Test
    void updateOrderStatus_WhenCancelled_ShouldThrowException() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.CANCELLED).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED));
        assertEquals("Cannot update status of cancelled order", exception.getMessage());
    }

    @Test
    void updateOrderStatus_WhenDeliveredToOther_ShouldThrowException() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.DELIVERED).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED));
        assertEquals("Cannot change status of delivered order", exception.getMessage());
    }

    @Test
    void cancelOrder_WhenDelivered_ShouldThrowException() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.DELIVERED).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.cancelOrder("ORD001"));
        assertEquals("Cannot cancel delivered order", exception.getMessage());
    }

    @Test
    void cancelOrder_WhenAlreadyCancelled_ShouldThrowException() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.CANCELLED).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.cancelOrder("ORD001"));
        assertEquals("Order is already cancelled", exception.getMessage());
    }

    @Test
    void getOrderProducts_WhenExists_ShouldReturnProducts() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.CONFIRMED).createdAt(LocalDateTime.now()).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        OrderProduct orderProduct = OrderProduct.builder().orderId("ORD001").productId("PROD001").quantity(1).price(BigDecimal.TEN).build();
        when(orderProductRepository.findAll(org.mockito.ArgumentMatchers.<Specification<OrderProduct>>any()))
                .thenReturn(List.of(orderProduct));

        List<OrderProduct> result = orderService.getOrderProducts("ORD001");

        assertEquals(1, result.size());
        verify(orderProductRepository).findAll(org.mockito.ArgumentMatchers.<Specification<OrderProduct>>any());
    }

    @Test
    void deleteOrder_WhenDelivered_ShouldThrowException() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.DELIVERED).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.deleteOrder("ORD001"));
        assertEquals("Cannot delete delivered order", exception.getMessage());
        verify(orderRepository, never()).delete(any(Order.class));
    }

    @Test
    void deleteOrder_WhenValid_ShouldDeleteOrderAndProducts() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.CONFIRMED).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        orderService.deleteOrder("ORD001");

        verify(orderProductRepository).deleteByOrderId("ORD001");
        verify(orderRepository).delete(order);
    }

    @Test
    void listOrders_ShouldDelegateToRepository() {
        var pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        when(orderRepository.findAll(org.mockito.ArgumentMatchers.<Specification<Order>>any(), eq(pageable)))
            .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of()));

        orderService.listOrders(1001, OrderStatus.CONFIRMED, LocalDateTime.now().minusDays(1), LocalDateTime.now(), pageable);

        verify(orderRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Order>>any(), eq(pageable));
    }
}
