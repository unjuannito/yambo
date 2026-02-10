package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.OrderProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UserRepository;
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
    private UserRepository userRepository;

    @Mock
    private AuthService authService;

    @Mock
    private MailService mailService;

    @InjectMocks
    private OrderService orderService;

    @Test
    void createOrder_WhenNoProducts_ShouldThrowException() {
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.createOrder("USER001", List.of()));
        assertEquals("Order must contain at least one product", exception.getMessage());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void createOrder_WhenProductMissing_ShouldThrowException() {
        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD404")
                .quantity(1)
                .price(BigDecimal.TEN)
                .configuration(null)
                .build();

        when(productRepository.findById("PROD404")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> orderService.createOrder("USER001", List.of(orderProduct)));
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
                .configuration(null)
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        Order result = orderService.createOrder("USER001", List.of(orderProduct));

        assertEquals("ORD001", result.getId());
        verify(orderRepository).save(any(Order.class));

        ArgumentCaptor<OrderProduct> captor = ArgumentCaptor.forClass(OrderProduct.class);
        verify(orderProductRepository).save(captor.capture());
        assertEquals("ORD001", captor.getValue().getOrderId());
        assertEquals(BigDecimal.TEN, captor.getValue().getPrice()); // Price should be calculated from basePrice
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
                .configuration(null)
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.createOrder("USER001", List.of(orderProduct)));
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
                .configuration(null)
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.createOrder("USER001", List.of(orderProduct)));
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
                .configuration(null)
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.createOrder("USER001", List.of(orderProduct)));
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
                .configuration(null)
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        Order result = orderService.createOrder("USER001", List.of(orderProduct));

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

        orderService.listOrders("USER001", OrderStatus.CONFIRMED, LocalDateTime.now().minusDays(1), LocalDateTime.now(), pageable);

        verify(orderRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Order>>any(), eq(pageable));
    }

    @Test
    void createOrder_WithNoConfiguration_ShouldUseBasePrice() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of())
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(new BigDecimal("25.00"))
                .familyProduct(null)
                .build();

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.ZERO)
                .configuration(null)
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        orderService.createOrder("USER001", List.of(orderProduct));

        ArgumentCaptor<OrderProduct> captor = ArgumentCaptor.forClass(OrderProduct.class);
        verify(orderProductRepository).save(captor.capture());
        assertEquals(new BigDecimal("25.00"), captor.getValue().getPrice());
    }

    @Test
    void createOrder_WithEmptyConfiguration_ShouldUseBasePrice() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of())
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(new BigDecimal("25.00"))
                .familyProduct(null)
                .build();

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.ZERO)
                .configuration("")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        orderService.createOrder("USER001", List.of(orderProduct));

        ArgumentCaptor<OrderProduct> captor = ArgumentCaptor.forClass(OrderProduct.class);
        verify(orderProductRepository).save(captor.capture());
        assertEquals(new BigDecimal("25.00"), captor.getValue().getPrice());
    }

    @Test
    void createOrder_WithOptionPrice_ShouldAddToBasePrice() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of())
                .build();

        ProductOption option = ProductOption.builder()
                .name("CustomText")
                .type("text_input")
                .price(new BigDecimal("5.00"))
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(new BigDecimal("25.00"))
                .familyProduct(null)
                .build();
        product.setOptions(List.of(option));

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.ZERO)
                .configuration("{\"CustomText\":\"My Name\"}")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        orderService.createOrder("USER001", List.of(orderProduct));

        ArgumentCaptor<OrderProduct> captor = ArgumentCaptor.forClass(OrderProduct.class);
        verify(orderProductRepository).save(captor.capture());
        assertEquals(new BigDecimal("30.00"), captor.getValue().getPrice()); // 25 + 5
    }

    @Test
    void createOrder_WithSelectOptionValue_ShouldAddValuePrice() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of())
                .build();

        OptionValue smallValue = OptionValue.builder()
                .id("small")
                .label("Small")
                .price(BigDecimal.ZERO)
                .build();

        OptionValue largeValue = OptionValue.builder()
                .id("large")
                .label("Large")
                .price(new BigDecimal("3.00"))
                .build();

        ProductOption sizeOption = ProductOption.builder()
                .name("Size")
                .type("select")
                .values(List.of(smallValue, largeValue))
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(new BigDecimal("25.00"))
                .familyProduct(null)
                .build();
        product.setOptions(List.of(sizeOption));

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.ZERO)
                .configuration("{\"Size\":\"Large\"}")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        orderService.createOrder("USER001", List.of(orderProduct));

        ArgumentCaptor<OrderProduct> captor = ArgumentCaptor.forClass(OrderProduct.class);
        verify(orderProductRepository).save(captor.capture());
        assertEquals(new BigDecimal("28.00"), captor.getValue().getPrice()); // 25 + 3
    }

    @Test
    void createOrder_WithMultipleOptions_ShouldAddAllPrices() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of())
                .build();

        OptionValue colorRed = OptionValue.builder()
                .id("red")
                .label("Red")
                .price(new BigDecimal("2.00"))
                .build();

        OptionValue colorBlue = OptionValue.builder()
                .id("blue")
                .label("Blue")
                .price(new BigDecimal("2.50"))
                .build();

        ProductOption colorOption = ProductOption.builder()
                .name("Color")
                .type("select")
                .values(List.of(colorRed, colorBlue))
                .build();

        ProductOption customNameOption = ProductOption.builder()
                .name("CustomName")
                .type("text_input")
                .price(new BigDecimal("5.00"))
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(new BigDecimal("25.00"))
                .familyProduct(null)
                .build();
        product.setOptions(List.of(colorOption, customNameOption));

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.ZERO)
                .configuration("{\"Color\":\"Blue\",\"CustomName\":\"John\"}")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        orderService.createOrder("USER001", List.of(orderProduct));

        ArgumentCaptor<OrderProduct> captor = ArgumentCaptor.forClass(OrderProduct.class);
        verify(orderProductRepository).save(captor.capture());
        assertEquals(new BigDecimal("32.50"), captor.getValue().getPrice()); // 25 + 2.5 + 5
    }

    @Test
    void createOrder_WithInvalidConfiguration_ShouldUseBasePrice() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of())
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(new BigDecimal("25.00"))
                .familyProduct(null)
                .build();

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.ZERO)
                .configuration("{invalid json")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        orderService.createOrder("USER001", List.of(orderProduct));

        ArgumentCaptor<OrderProduct> captor = ArgumentCaptor.forClass(OrderProduct.class);
        verify(orderProductRepository).save(captor.capture());
        assertEquals(new BigDecimal("25.00"), captor.getValue().getPrice()); // Falls back to base price
    }

    @Test
    void createOrder_WithNonExistentOptionInConfig_ShouldIgnoreIt() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of())
                .build();

        ProductOption option = ProductOption.builder()
                .name("RealOption")
                .type("text_input")
                .price(new BigDecimal("5.00"))
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(new BigDecimal("25.00"))
                .familyProduct(null)
                .build();
        product.setOptions(List.of(option));

        OrderProduct orderProduct = OrderProduct.builder()
                .productId("PROD001")
                .quantity(1)
                .price(BigDecimal.ZERO)
                .configuration("{\"FakeOption\":\"value\",\"RealOption\":\"My Name\"}")
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId("ORD001");
            return saved;
        });

        orderService.createOrder("USER001", List.of(orderProduct));

        ArgumentCaptor<OrderProduct> captor = ArgumentCaptor.forClass(OrderProduct.class);
        verify(orderProductRepository).save(captor.capture());
        assertEquals(new BigDecimal("30.00"), captor.getValue().getPrice()); // Only adds real option: 25 + 5
    }

    // Email notification tests
    @Test
    void updateOrderStatus_WhenStatusChanges_ShouldSendEmail() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_CONFIRMATION)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .build();

        OrderProduct orderProduct = OrderProduct.builder()
                .orderId("ORD001")
                .productId("PROD001")
                .quantity(2)
                .price(new BigDecimal("25.00"))
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of(orderProduct));
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED);

        verify(mailService).sendOrderStatusUpdate(
                eq("user@test.com"),
                eq("Test User"),
                eq("ORD001"),
                any(LocalDateTime.class),
                eq(OrderStatus.CONFIRMED),
                any(),
                eq(new BigDecimal("50.00")) // 2 * 25.00
        );
    }

    @Test
    void updateOrderStatus_WhenEmailFails_ShouldStillUpdateOrder() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_CONFIRMATION)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of());
        doThrow(new RuntimeException("Email service unavailable"))
                .when(mailService).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());

        // Should not throw exception even if email fails
        Order result = orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED);

        assertEquals(OrderStatus.CONFIRMED, result.getStatus());
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void updateOrderStatus_WhenUserNotFound_ShouldNotSendEmail() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER404")
                .status(OrderStatus.PENDING_CONFIRMATION)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(userRepository.findById("USER404")).thenReturn(Optional.empty());

        orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED);

        verify(mailService, never()).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void updateOrderStatus_WhenUserHasNoEmail_ShouldNotSendEmail() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_CONFIRMATION)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email(null)
                .name("Test User")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));

        orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED);

        verify(mailService, never()).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void updateOrderStatus_WhenSameStatus_ShouldNotSendEmail() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);

        orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED);

        verify(mailService, never()).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());
    }

    // Configuration validation tests

    @Test
    void updateOrderStatus_WithInvalidConfiguration_ShouldFilterOut() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_CONFIRMATION)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        OptionValue sizeValue = OptionValue.builder()
                .id("xl")
                .label("XL")
                .price(BigDecimal.ZERO)
                .build();

        ProductOption sizeOption = ProductOption.builder()
                .name("Size")
                .type("select")
                .values(List.of(sizeValue))
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .build();
        product.setOptions(List.of(sizeOption));

        // Configuration contains an invalid option "Color" that doesn't exist
        OrderProduct orderProduct = OrderProduct.builder()
                .orderId("ORD001")
                .productId("PROD001")
                .quantity(1)
                .price(new BigDecimal("25.00"))
                .configuration("{\"Size\":\"xl\",\"Color\":\"red\"}")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of(orderProduct));
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MailService.OrderProductInfo>> captor = ArgumentCaptor.forClass(List.class);
        verify(mailService).sendOrderStatusUpdate(
                any(),
                any(),
                any(),
                any(),
                any(),
                captor.capture(),
                any()
        );

        // Verify that configuration only contains valid option (Size) and shows label (XL) not ID (xl)
        List<MailService.OrderProductInfo> productInfos = captor.getValue();
        assertEquals(1, productInfos.size());
        String config = productInfos.get(0).getConfiguration();
        assertNotNull(config);
        assertTrue(config.contains("Size: XL"));
        assertFalse(config.contains("Color"));
    }

    @Test
    void updateOrderStatus_WithInvalidSelectValue_ShouldFilterOut() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_CONFIRMATION)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        OptionValue sizeValue = OptionValue.builder()
                .id("xl")
                .label("XL")
                .price(BigDecimal.ZERO)
                .build();

        ProductOption sizeOption = ProductOption.builder()
                .name("Size")
                .type("select")
                .values(List.of(sizeValue))
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .build();
        product.setOptions(List.of(sizeOption));

        // Configuration has invalid value "xxl" for Size option
        OrderProduct orderProduct = OrderProduct.builder()
                .orderId("ORD001")
                .productId("PROD001")
                .quantity(1)
                .price(new BigDecimal("25.00"))
                .configuration("{\"Size\":\"xxl\"}")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of(orderProduct));
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MailService.OrderProductInfo>> captor = ArgumentCaptor.forClass(List.class);
        verify(mailService).sendOrderStatusUpdate(
                any(),
                any(),
                any(),
                any(),
                any(),
                captor.capture(),
                any()
        );

        // Configuration should be null or empty since the only option value is invalid
        List<MailService.OrderProductInfo> productInfos = captor.getValue();
        assertEquals(1, productInfos.size());
        String config = productInfos.get(0).getConfiguration();
        assertNull(config); // Should be null since all values were filtered out
    }

    @Test
    void updateOrderStatus_WithNullAndBlankValues_ShouldFilterOut() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_CONFIRMATION)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        OptionValue colorValue = OptionValue.builder()
                .id("red")
                .label("Red")
                .price(BigDecimal.ZERO)
                .build();

        ProductOption colorOption = ProductOption.builder()
                .name("Color")
                .type("select")
                .values(List.of(colorValue))
                .build();

        ProductOption notesOption = ProductOption.builder()
                .name("Notes")
                .type("text_input")
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .build();
        product.setOptions(List.of(colorOption, notesOption));

        // Configuration has a valid value and a blank value
        OrderProduct orderProduct = OrderProduct.builder()
                .orderId("ORD001")
                .productId("PROD001")
                .quantity(1)
                .price(new BigDecimal("25.00"))
                .configuration("{\"Color\":\"red\",\"Notes\":\"\"}")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of(orderProduct));
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MailService.OrderProductInfo>> captor = ArgumentCaptor.forClass(List.class);
        verify(mailService).sendOrderStatusUpdate(
                any(),
                any(),
                any(),
                any(),
                any(),
                captor.capture(),
                any()
        );

        // Configuration should only contain Color, not Notes (blank)
        List<MailService.OrderProductInfo> productInfos = captor.getValue();
        assertEquals(1, productInfos.size());
        String config = productInfos.get(0).getConfiguration();
        assertNotNull(config);
        assertTrue(config.contains("Color: Red"));
        assertFalse(config.contains("Notes"));
    }

    @Test
    void updateOrderStatus_WithValidConfiguration_ShouldShowLabels() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_CONFIRMATION)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        OptionValue sizeValue = OptionValue.builder()
                .id("xl")
                .label("Extra Large")
                .price(BigDecimal.ZERO)
                .build();

        OptionValue colorValue = OptionValue.builder()
                .id("blue")
                .label("Ocean Blue")
                .price(BigDecimal.ZERO)
                .build();

        ProductOption sizeOption = ProductOption.builder()
                .name("Size")
                .type("select")
                .values(List.of(sizeValue))
                .build();

        ProductOption colorOption = ProductOption.builder()
                .name("Color")
                .type("select")
                .values(List.of(colorValue))
                .build();

        ProductOption customTextOption = ProductOption.builder()
                .name("CustomText")
                .type("text_input")
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .build();
        product.setOptions(List.of(sizeOption, colorOption, customTextOption));

        // Configuration with IDs for select options
        OrderProduct orderProduct = OrderProduct.builder()
                .orderId("ORD001")
                .productId("PROD001")
                .quantity(1)
                .price(new BigDecimal("25.00"))
                .configuration("{\"Size\":\"xl\",\"Color\":\"blue\",\"CustomText\":\"My Name\"}")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of(orderProduct));
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        orderService.updateOrderStatus("ORD001", OrderStatus.CONFIRMED);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MailService.OrderProductInfo>> captor = ArgumentCaptor.forClass(List.class);
        verify(mailService).sendOrderStatusUpdate(
                any(),
                any(),
                any(),
                any(),
                any(),
                captor.capture(),
                any()
        );

        // Configuration should show labels for select options, not IDs
        List<MailService.OrderProductInfo> productInfos = captor.getValue();
        assertEquals(1, productInfos.size());
        String config = productInfos.get(0).getConfiguration();
        assertNotNull(config);
        assertTrue(config.contains("Size: Extra Large"));
        assertTrue(config.contains("Color: Ocean Blue"));
        assertTrue(config.contains("CustomText: My Name"));
        // Should not contain IDs
        assertFalse(config.contains("xl") && config.contains("Size:"));
        assertFalse(config.contains("blue") && config.contains("Color:"));
    }
}

