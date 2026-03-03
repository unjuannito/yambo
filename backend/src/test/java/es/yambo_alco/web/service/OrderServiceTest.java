package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.OrderProductStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.repository.IssueRepository;
import es.yambo_alco.web.repository.OrderProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.OrderStatusHistoryRepository;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UploadedFileRepository;
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
    private UploadedFileRepository uploadedFileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private IssueRepository issueRepository;

    @Mock
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

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
        Order order = Order.builder().id("ORD001").status(OrderStatus.CANCELED).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED));
        assertEquals("Cannot update status of canceled order", exception.getMessage());
    }

    @Test
    void updateOrderStatus_WhenClosedToOther_ShouldThrowException() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.CLOSED).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED));
        assertEquals("Cannot change status of closed order", exception.getMessage());
    }

    @Test
    void cancelOrder_WhenNotPendingPayment_ShouldThrowException() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.PAYMENT_CONFIRMED).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.cancelOrder("ORD001", false));
        assertEquals("Order can only be canceled when pending payment or confirming payment", exception.getMessage());
    }

    @Test
    void cancelOrder_WhenConfirmingPayment_ShouldCancel() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.CONFIRMING_PAYMENT).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Order result = orderService.cancelOrder("ORD001", true);
        assertEquals(OrderStatus.CANCELED, result.getStatus());
        assertNotNull(result.getClosedAt());
    }

    @Test
    void cancelOrder_WhenPendingPayment_ShouldCancel() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.PENDING_PAYMENT).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Order result = orderService.cancelOrder("ORD001", false);
        assertEquals(OrderStatus.CANCELED, result.getStatus());
        assertNotNull(result.getClosedAt());
    }

    @Test
    void cancelOrder_ByUser_ShouldSendEmailWithCanceledByAdminFalse() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of());

        orderService.cancelOrder("ORD001", false);

        verify(mailService).sendOrderCanceled(
                eq("user@test.com"),
                eq("Test User"),
                eq("ORD001"),
                any(LocalDateTime.class),
                any(),
                any(),
                eq(false));
    }

    @Test
    void cancelOrder_ByAdmin_ShouldSendEmailWithCanceledByAdminTrue() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of());

        orderService.cancelOrder("ORD001", true);

        verify(mailService).sendOrderCanceled(
                eq("user@test.com"),
                eq("Test User"),
                eq("ORD001"),
                any(LocalDateTime.class),
                any(),
                any(),
                eq(true));
    }

    @Test
    void cancelOrder_WhenEmailFails_ShouldStillCancel() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of());
        doThrow(new RuntimeException("Email unavailable"))
                .when(mailService).sendOrderCanceled(any(), any(), any(), any(), any(), any(), anyBoolean());

        Order result = orderService.cancelOrder("ORD001", false);

        assertEquals(OrderStatus.CANCELED, result.getStatus());
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void updateOrderStatus_ToCanceled_ShouldSendCancelEmail() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
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

        orderService.updateOrderStatus("ORD001", OrderStatus.CANCELED);

        verify(mailService).sendOrderCanceled(any(), any(), any(), any(), any(), any(), eq(true));
        verify(mailService, never()).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void getOrderProducts_WhenExists_ShouldReturnProducts() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.PAYMENT_CONFIRMED).createdAt(LocalDateTime.now()).build();
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
        Order order = Order.builder().id("ORD001").status(OrderStatus.CLOSED).build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.deleteOrder("ORD001"));
        assertEquals("Cannot delete closed order", exception.getMessage());
        verify(orderRepository, never()).delete(any(Order.class));
    }

    @Test
    void deleteOrder_WhenValid_ShouldDeleteOrderAndProducts() {
        Order order = Order.builder().id("ORD001").status(OrderStatus.PAYMENT_CONFIRMED).build();
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

        orderService.listOrders("USER001", List.of(OrderStatus.PAYMENT_CONFIRMED), LocalDateTime.now().minusDays(1), LocalDateTime.now(), pageable);

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
                .status(OrderStatus.PENDING_PAYMENT)
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

        orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED);

        verify(mailService).sendOrderStatusUpdate(
                eq("user@test.com"),
                eq("Test User"),
                eq("ORD001"),
                any(LocalDateTime.class),
                eq(OrderStatus.PAYMENT_CONFIRMED),
                any(),
                eq(new BigDecimal("50.00")) // 2 * 25.00
        );
    }

    @Test
    void updateOrderStatus_WhenEmailFails_ShouldStillUpdateOrder() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
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
        Order result = orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED);

        assertEquals(OrderStatus.PAYMENT_CONFIRMED, result.getStatus());
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void updateOrderStatus_WhenUserNotFound_ShouldNotSendEmail() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER404")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);
        when(userRepository.findById("USER404")).thenReturn(Optional.empty());

        orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED);

        verify(mailService, never()).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void updateOrderStatus_WhenUserHasNoEmail_ShouldNotSendEmail() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
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

        orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED);

        verify(mailService, never()).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void updateOrderStatus_WhenSameStatus_ShouldNotSendEmail() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);

        orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED);

        verify(mailService, never()).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());
    }

    // Configuration validation tests

    @Test
    void updateOrderStatus_WithInvalidConfiguration_ShouldFilterOut() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
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

        orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED);

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
        String config = productInfos.get(0).configuration();
        assertNotNull(config);
        assertTrue(config.contains("Size: XL"));
        assertFalse(config.contains("Color"));
    }

    @Test
    void updateOrderStatus_WithInvalidSelectValue_ShouldFilterOut() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
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

        orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED);

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
        String config = productInfos.get(0).configuration();
        assertNull(config); // Should be null since all values were filtered out
    }

    @Test
    void updateOrderStatus_WithNullAndBlankValues_ShouldFilterOut() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
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

        orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED);

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
        String config = productInfos.get(0).configuration();
        assertNotNull(config);
        assertTrue(config.contains("Color: Red"));
        assertFalse(config.contains("Notes"));
    }

    @Test
    void updateOrderStatus_WithValidConfiguration_ShouldShowLabels() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
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

        orderService.updateOrderStatus("ORD001", OrderStatus.PAYMENT_CONFIRMED);

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
        String config = productInfos.get(0).configuration();
        assertNotNull(config);
        assertTrue(config.contains("Size: Extra Large"));
        assertTrue(config.contains("Color: Ocean Blue"));
        assertTrue(config.contains("CustomText: My Name"));
        // Should not contain IDs
        assertFalse(config.contains("xl") && config.contains("Size:"));
        assertFalse(config.contains("blue") && config.contains("Color:"));
    }

    // Order product status propagation tests

    @Test
    void updateOrderProductStatusByFamilyProduct_PendingFabrication_ShouldTransitionOrderToPendingProducts() {
        Product product = Product.builder().id("PROD001").name("T-Shirt").build();
        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.ORDER_CLOSED).build();
        Order order = Order.builder()
                .id("ORD001").customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.now()).build();
        User user = User.builder().id("USER001").email("u@test.com").name("User").build();

        @SuppressWarnings("unchecked")
        Specification<Product> prodSpec = any(Specification.class);
        when(productRepository.findAll(prodSpec)).thenReturn(List.of(product));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(orderProductRepository.save(any(OrderProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));

        orderService.updateOrderProductStatusByFamilyProduct("FAM001", OrderProductStatus.PENDING_FABRICATION);

        assertEquals(OrderProductStatus.PENDING_FABRICATION, op.getStatus());
        assertEquals(OrderStatus.PENDING_PRODUCTS, order.getStatus());
        verify(mailService).sendOrderStatusUpdate(
                eq("u@test.com"), eq("User"), eq("ORD001"),
                any(), eq(OrderStatus.PENDING_PRODUCTS), any(), any());
    }

    @Test
    void updateOrderProductStatusByFamilyProduct_OrderClosed_ShouldNotTransitionOrder() {
        Product product = Product.builder().id("PROD001").name("T-Shirt").build();
        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.OPEN).build();

        @SuppressWarnings("unchecked")
        Specification<Product> prodSpec = any(Specification.class);
        when(productRepository.findAll(prodSpec)).thenReturn(List.of(product));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(orderProductRepository.save(any(OrderProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        orderService.updateOrderProductStatusByFamilyProduct("FAM001", OrderProductStatus.ORDER_CLOSED);

        assertEquals(OrderProductStatus.ORDER_CLOSED, op.getStatus());
        // Should NOT attempt to transition orders for ORDER_CLOSED status
        verify(orderRepository, never()).findById(any());
        verify(mailService, never()).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void updateOrderProductStatusByFamilyProduct_ShouldSkipCanceledProducts() {
        Product product = Product.builder().id("PROD001").name("T-Shirt").build();
        OrderProduct canceledOp = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.CANCELED).build();

        @SuppressWarnings("unchecked")
        Specification<Product> prodSpec = any(Specification.class);
        when(productRepository.findAll(prodSpec)).thenReturn(List.of(product));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(canceledOp));

        orderService.updateOrderProductStatusByFamilyProduct("FAM001", OrderProductStatus.PENDING_FABRICATION);

        assertEquals(OrderProductStatus.CANCELED, canceledOp.getStatus()); // Should remain CANCELED
        verify(orderProductRepository, never()).save(any());
    }

    @Test
    void updateOrderProductStatusByFamilyProduct_NoProducts_ShouldDoNothing() {
        @SuppressWarnings("unchecked")
        Specification<Product> prodSpec = any(Specification.class);
        when(productRepository.findAll(prodSpec)).thenReturn(List.of());

        orderService.updateOrderProductStatusByFamilyProduct("FAM001", OrderProductStatus.PENDING_FABRICATION);

        verify(orderProductRepository, never()).findAll(org.mockito.ArgumentMatchers.<Specification<OrderProduct>>any());
        verify(orderRepository, never()).findById(any());
    }

    @Test
    void updateOrderProductStatusByFamilyProduct_OrderAlreadyPendingProducts_ShouldNotTransitionAgain() {
        Product product = Product.builder().id("PROD001").name("T-Shirt").build();
        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.PENDING_FABRICATION).build();
        Order order = Order.builder()
                .id("ORD001").customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now()).build();

        @SuppressWarnings("unchecked")
        Specification<Product> prodSpec = any(Specification.class);
        when(productRepository.findAll(prodSpec)).thenReturn(List.of(product));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(orderProductRepository.save(any(OrderProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        orderService.updateOrderProductStatusByFamilyProduct("FAM001", OrderProductStatus.TO_BE_DELIVERED);

        // Order should stay at PENDING_PRODUCTS (not PAYMENT_CONFIRMED, so no transition)
        assertEquals(OrderStatus.PENDING_PRODUCTS, order.getStatus());
        verify(orderRepository, never()).save(any(Order.class));
        verify(mailService, never()).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());
    }

    // ---- hasOpenIssues tests ----

    @Test
    void hasOpenIssues_WithOpenIssue_ShouldReturnTrue() {
        Issue openIssue = Issue.builder().id("ISS001").status(IssueStatus.OPEN).build();
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of(openIssue));

        assertTrue(orderService.hasOpenIssues("ORD001"));
    }

    @Test
    void hasOpenIssues_WithInProgressIssue_ShouldReturnTrue() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.IN_PROGRESS).build();
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of(issue));

        assertTrue(orderService.hasOpenIssues("ORD001"));
    }

    @Test
    void hasOpenIssues_WithReopenedIssue_ShouldReturnTrue() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.REOPENED).build();
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of(issue));

        assertTrue(orderService.hasOpenIssues("ORD001"));
    }

    @Test
    void hasOpenIssues_WithOnlyResolvedAndClosedIssues_ShouldReturnFalse() {
        Issue resolved = Issue.builder().id("ISS001").status(IssueStatus.RESOLVED).build();
        Issue closed = Issue.builder().id("ISS002").status(IssueStatus.CLOSED).build();
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of(resolved, closed));

        assertFalse(orderService.hasOpenIssues("ORD001"));
    }

    @Test
    void hasOpenIssues_WithNoIssues_ShouldReturnFalse() {
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of());

        assertFalse(orderService.hasOpenIssues("ORD001"));
    }

    // ---- checkAndCloseOrder tests ----

    @Test
    void checkAndCloseOrder_WhenAllDeliveredAndNoOpenIssues_ShouldClose() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        OrderProduct op1 = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.DELIVERED).build();
        OrderProduct op2 = OrderProduct.builder()
                .orderId("ORD001").productId("PROD002").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.DELIVERED).build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op1, op2));
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of());
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        orderService.checkAndCloseOrder("ORD001");

        assertEquals(OrderStatus.CLOSED, order.getStatus());
        assertNotNull(order.getClosedAt());
        verify(orderRepository).save(order);
    }

    @Test
    void checkAndCloseOrder_WhenNotAllDelivered_ShouldNotClose() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        OrderProduct op1 = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.DELIVERED).build();
        OrderProduct op2 = OrderProduct.builder()
                .orderId("ORD001").productId("PROD002").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.TO_BE_DELIVERED).build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op1, op2));

        orderService.checkAndCloseOrder("ORD001");

        assertEquals(OrderStatus.PENDING_PRODUCTS, order.getStatus());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void checkAndCloseOrder_WhenAllDeliveredButOpenIssues_ShouldNotClose() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.DELIVERED).build();

        Issue openIssue = Issue.builder().id("ISS001").status(IssueStatus.OPEN).build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of(openIssue));

        orderService.checkAndCloseOrder("ORD001");

        assertEquals(OrderStatus.PENDING_PRODUCTS, order.getStatus());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void checkAndCloseOrder_WhenAllDeliveredButInProgressIssues_ShouldNotClose() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.DELIVERED).build();

        Issue inProgressIssue = Issue.builder().id("ISS001").status(IssueStatus.IN_PROGRESS).build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of(inProgressIssue));

        orderService.checkAndCloseOrder("ORD001");

        assertEquals(OrderStatus.PENDING_PRODUCTS, order.getStatus());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void checkAndCloseOrder_WhenAllDeliveredButReopenedIssues_ShouldNotClose() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.DELIVERED).build();

        Issue reopenedIssue = Issue.builder().id("ISS001").status(IssueStatus.REOPENED).build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of(reopenedIssue));

        orderService.checkAndCloseOrder("ORD001");

        assertEquals(OrderStatus.PENDING_PRODUCTS, order.getStatus());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void checkAndCloseOrder_WhenAllDeliveredAndOnlyResolvedClosedIssues_ShouldClose() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.DELIVERED).build();

        Issue resolved = Issue.builder().id("ISS001").status(IssueStatus.RESOLVED).build();
        Issue closed = Issue.builder().id("ISS002").status(IssueStatus.CLOSED).build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of(resolved, closed));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        orderService.checkAndCloseOrder("ORD001");

        assertEquals(OrderStatus.CLOSED, order.getStatus());
        assertNotNull(order.getClosedAt());
        verify(orderRepository).save(order);
    }

    @Test
    void checkAndCloseOrder_WhenAlreadyClosed_ShouldDoNothing() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.CLOSED)
                .closedAt(LocalDateTime.now().minusDays(1))
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        orderService.checkAndCloseOrder("ORD001");

        verify(orderProductRepository, never()).findAll(org.mockito.ArgumentMatchers.<Specification<OrderProduct>>any());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void checkAndCloseOrder_WhenAlreadyCanceled_ShouldDoNothing() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.CANCELED)
                .closedAt(LocalDateTime.now().minusDays(1))
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        orderService.checkAndCloseOrder("ORD001");

        verify(orderProductRepository, never()).findAll(org.mockito.ArgumentMatchers.<Specification<OrderProduct>>any());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void checkAndCloseOrder_WhenEmptyProducts_ShouldNotClose() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of());

        orderService.checkAndCloseOrder("ORD001");

        assertEquals(OrderStatus.PENDING_PRODUCTS, order.getStatus());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void checkAndCloseOrder_WhenClosed_ShouldSendEmail() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.DELIVERED).build();

        Product product = Product.builder().id("PROD001").name("T-Shirt").build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of());
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(product));

        orderService.checkAndCloseOrder("ORD001");

        verify(mailService).sendOrderStatusUpdate(
                eq("user@test.com"), eq("Test User"), eq("ORD001"),
                any(), eq(OrderStatus.CLOSED), any(), any());
    }

    @Test
    void checkAndCloseOrder_WhenEmailFails_ShouldStillClose() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.DELIVERED).build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of());
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("Email unavailable"))
                .when(mailService).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());

        orderService.checkAndCloseOrder("ORD001");

        assertEquals(OrderStatus.CLOSED, order.getStatus());
        verify(orderRepository).save(order);
    }

    // ---- updateOrderProductStatusByFamilyProduct: DELIVERED triggers auto-close ----

    @Test
    void updateOrderProductStatusByFamilyProduct_Delivered_ShouldTriggerAutoClose() {
        Product product = Product.builder().id("PROD001").name("T-Shirt").build();
        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.TO_BE_DELIVERED).build();
        Order order = Order.builder()
                .id("ORD001").customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now()).build();

        @SuppressWarnings("unchecked")
        Specification<Product> prodSpec = any(Specification.class);
        when(productRepository.findAll(prodSpec)).thenReturn(List.of(product));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(orderProductRepository.save(any(OrderProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of());

        orderService.updateOrderProductStatusByFamilyProduct("FAM001", OrderProductStatus.DELIVERED);

        assertEquals(OrderProductStatus.DELIVERED, op.getStatus());
        // Auto-close should be triggered, and since all products delivered + no issues -> CLOSED
        assertEquals(OrderStatus.CLOSED, order.getStatus());
        assertNotNull(order.getClosedAt());
    }

    @Test
    void updateOrderProductStatusByFamilyProduct_Delivered_WithOpenIssues_ShouldNotAutoClose() {
        Product product = Product.builder().id("PROD001").name("T-Shirt").build();
        OrderProduct op = OrderProduct.builder()
                .orderId("ORD001").productId("PROD001").quantity(1)
                .price(BigDecimal.TEN).status(OrderProductStatus.TO_BE_DELIVERED).build();
        Order order = Order.builder()
                .id("ORD001").customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now()).build();

        Issue openIssue = Issue.builder().id("ISS001").status(IssueStatus.OPEN).build();

        @SuppressWarnings("unchecked")
        Specification<Product> prodSpec = any(Specification.class);
        when(productRepository.findAll(prodSpec)).thenReturn(List.of(product));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(op));
        when(orderProductRepository.save(any(OrderProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of(openIssue));

        orderService.updateOrderProductStatusByFamilyProduct("FAM001", OrderProductStatus.DELIVERED);

        assertEquals(OrderProductStatus.DELIVERED, op.getStatus());
        // Should NOT auto-close because of open issues
        assertEquals(OrderStatus.PENDING_PRODUCTS, order.getStatus());
    }

    // ---- getOrdersByCustomer tests ----

    @Test
    void getOrdersByCustomer_ShouldReturnOrders() {
        Order order1 = Order.builder().id("ORD001").customerId("USER001").build();
        Order order2 = Order.builder().id("ORD002").customerId("USER001").build();
        when(orderRepository.findAll(org.mockito.ArgumentMatchers.<Specification<Order>>any()))
                .thenReturn(List.of(order1, order2));

        List<Order> result = orderService.getOrdersByCustomer("USER001");

        assertEquals(2, result.size());
        verify(orderRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Order>>any());
    }

    @Test
    void getOrdersByCustomer_WhenNoOrders_ShouldReturnEmptyList() {
        when(orderRepository.findAll(org.mockito.ArgumentMatchers.<Specification<Order>>any()))
                .thenReturn(List.of());

        List<Order> result = orderService.getOrdersByCustomer("USER001");

        assertTrue(result.isEmpty());
    }

    // ---- createOrder: email behavior ----

    @Test
    void createOrder_ShouldSendCreationEmail() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .name("Test User")
                .profiles(Set.of())
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(BigDecimal.TEN)
                .familyProduct(null)
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
        // sendOrderStatusUpdateEmail internally calls getOrderProducts -> getOrderById
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(
                Order.builder().id("ORD001").customerId("USER001").status(OrderStatus.PENDING_PAYMENT).createdAt(LocalDateTime.now()).build()));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(orderProduct));

        orderService.createOrder("USER001", List.of(orderProduct));

        verify(mailService).sendOrderStatusUpdate(
                eq("test@test.com"), eq("Test User"), eq("ORD001"),
                any(), eq(OrderStatus.PENDING_PAYMENT), any(), any());
    }

    @Test
    void createOrder_WhenEmailFails_ShouldStillCreateOrder() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .name("Test User")
                .profiles(Set.of())
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(BigDecimal.TEN)
                .familyProduct(null)
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
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(
                Order.builder().id("ORD001").customerId("USER001").status(OrderStatus.PENDING_PAYMENT).createdAt(LocalDateTime.now()).build()));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> opSpec = any(Specification.class);
        when(orderProductRepository.findAll(opSpec)).thenReturn(List.of(orderProduct));
        doThrow(new RuntimeException("Email unavailable"))
                .when(mailService).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());

        Order result = orderService.createOrder("USER001", List.of(orderProduct));

        assertNotNull(result);
        assertEquals("ORD001", result.getId());
        verify(orderRepository).save(any(Order.class));
    }

    // ---- createOrder: order status defaults ----

    @Test
    void createOrder_ShouldSetStatusToPendingPayment() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of())
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(BigDecimal.TEN)
                .familyProduct(null)
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

        assertEquals(OrderStatus.PENDING_PAYMENT, result.getStatus());
    }

    @Test
    void createOrder_ShouldSetProductStatusToOpen() {
        User user = User.builder()
                .id("USER001")
                .email("test@test.com")
                .profiles(Set.of())
                .build();

        Product product = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .basePrice(BigDecimal.TEN)
                .familyProduct(null)
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

        orderService.createOrder("USER001", List.of(orderProduct));

        ArgumentCaptor<OrderProduct> captor = ArgumentCaptor.forClass(OrderProduct.class);
        verify(orderProductRepository).save(captor.capture());
        assertEquals(OrderProductStatus.OPEN, captor.getValue().getStatus());
    }

    // ---- updateOrderStatus: closedAt set ----

    @Test
    void updateOrderStatus_ToClosed_ShouldSetClosedAt() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Order result = orderService.updateOrderStatus("ORD001", OrderStatus.CLOSED);

        assertEquals(OrderStatus.CLOSED, result.getStatus());
        assertNotNull(result.getClosedAt());
    }

    @Test
    void updateOrderStatus_ToCanceled_ShouldSetClosedAt() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Order result = orderService.updateOrderStatus("ORD001", OrderStatus.CANCELED);

        assertEquals(OrderStatus.CANCELED, result.getStatus());
        assertNotNull(result.getClosedAt());
    }

    // ---- cancelOrder: email edge cases ----

    @Test
    void cancelOrder_WhenUserNotFound_ShouldStillCancel() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER404")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("USER404")).thenReturn(Optional.empty());

        Order result = orderService.cancelOrder("ORD001", false);

        assertEquals(OrderStatus.CANCELED, result.getStatus());
        verify(mailService, never()).sendOrderCanceled(any(), any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void cancelOrder_WhenUserHasNoEmail_ShouldStillCancel() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email(null)
                .name("Test User")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));

        Order result = orderService.cancelOrder("ORD001", false);

        assertEquals(OrderStatus.CANCELED, result.getStatus());
        verify(mailService, never()).sendOrderCanceled(any(), any(), any(), any(), any(), any(), anyBoolean());
    }

    // ---- deleteOrder edge cases ----

    @Test
    void deleteOrder_WhenCanceled_ShouldAllowDeletion() {
        Order order = Order.builder()
                .id("ORD001")
                .status(OrderStatus.CANCELED)
                .build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        orderService.deleteOrder("ORD001");

        verify(orderProductRepository).deleteByOrderId("ORD001");
        verify(orderRepository).delete(order);
    }

    @Test
    void deleteOrder_WhenPendingPayment_ShouldAllowDeletion() {
        Order order = Order.builder()
                .id("ORD001")
                .status(OrderStatus.PENDING_PAYMENT)
                .build();
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        orderService.deleteOrder("ORD001");

        verify(orderProductRepository).deleteByOrderId("ORD001");
        verify(orderRepository).delete(order);
    }

    @Test
    void deleteOrder_WhenNotFound_ShouldThrowException() {
        when(orderRepository.findById("ORD404")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> orderService.deleteOrder("ORD404"));
    }

    // ---- uploadReceipt tests ----

    @Test
    void uploadReceipt_WhenValid_ShouldTransitionToConfirmingPayment() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        UploadedFile file = UploadedFile.builder()
                .id("FL000001")
                .originalName("receipt.pdf")
                .storedName("receipt_abc.pdf")
                .contentType("application/pdf")
                .size(1024L)
                .url("/uploads/receipt_abc.pdf")
                .uploadedAt(LocalDateTime.now())
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(uploadedFileRepository.findById("FL000001")).thenReturn(Optional.of(file));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Order result = orderService.uploadReceipt("ORD001", "USER001", "FL000001");

        assertEquals(OrderStatus.CONFIRMING_PAYMENT, result.getStatus());
        assertEquals("FL000001", result.getReceiptFileId());
    }

    @Test
    void uploadReceipt_WhenNotOwner_ShouldThrowException() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.uploadReceipt("ORD001", "USER999", "FL000001"));
        assertEquals("Order does not belong to the specified customer", exception.getMessage());
    }

    @Test
    void uploadReceipt_WhenNotPendingPayment_ShouldThrowException() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.uploadReceipt("ORD001", "USER001", "FL000001"));
        assertEquals("Receipt can only be uploaded when order is pending payment", exception.getMessage());
    }

    @Test
    void uploadReceipt_WhenFileNotFound_ShouldThrowException() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(uploadedFileRepository.findById("FL999999")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> orderService.uploadReceipt("ORD001", "USER001", "FL999999"));
        assertEquals("Uploaded file not found: FL999999", exception.getMessage());
    }

    @Test
    void uploadReceipt_WhenEmailFails_ShouldStillUpload() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        UploadedFile file = UploadedFile.builder()
                .id("FL000001")
                .originalName("receipt.pdf")
                .storedName("receipt_abc.pdf")
                .contentType("application/pdf")
                .size(1024L)
                .url("/uploads/receipt_abc.pdf")
                .uploadedAt(LocalDateTime.now())
                .build();

        User user = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(uploadedFileRepository.findById("FL000001")).thenReturn(Optional.of(file));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(user));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of());
        doThrow(new RuntimeException("Email unavailable"))
                .when(mailService).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());

        Order result = orderService.uploadReceipt("ORD001", "USER001", "FL000001");

        assertEquals(OrderStatus.CONFIRMING_PAYMENT, result.getStatus());
        assertEquals("FL000001", result.getReceiptFileId());
    }

    // ---- uploadReceiptAsAdmin tests ----

    @Test
    void uploadReceiptAsAdmin_WhenValid_ShouldTransitionToConfirmingPayment() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        UploadedFile file = UploadedFile.builder()
                .id("FL000001")
                .originalName("receipt.pdf")
                .storedName("receipt_abc.pdf")
                .contentType("application/pdf")
                .size(1024L)
                .url("/uploads/receipt_abc.pdf")
                .uploadedAt(LocalDateTime.now())
                .build();

        User admin = User.builder().id("ADMIN01").name("Admin").build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(uploadedFileRepository.findById("FL000001")).thenReturn(Optional.of(file));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(authService.getCurrentUser(true)).thenReturn(admin);

        Order result = orderService.uploadReceiptAsAdmin("ORD001", "FL000001");

        assertEquals(OrderStatus.CONFIRMING_PAYMENT, result.getStatus());
        assertEquals("FL000001", result.getReceiptFileId());
    }

    @Test
    void uploadReceiptAsAdmin_WhenNotPendingOrConfirmingPayment_ShouldThrowException() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> orderService.uploadReceiptAsAdmin("ORD001", "FL000001"));
        assertEquals("Receipt can only be uploaded when order is pending or confirming payment", exception.getMessage());
    }

    @Test
    void uploadReceiptAsAdmin_WhenFileNotFound_ShouldThrowException() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(uploadedFileRepository.findById("FL999999")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> orderService.uploadReceiptAsAdmin("ORD001", "FL999999"));
        assertEquals("Uploaded file not found: FL999999", exception.getMessage());
    }

    @Test
    void uploadReceiptAsAdmin_WhenEmailFails_ShouldStillUpload() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        UploadedFile file = UploadedFile.builder()
                .id("FL000001")
                .originalName("receipt.pdf")
                .storedName("receipt_abc.pdf")
                .contentType("application/pdf")
                .size(1024L)
                .url("/uploads/receipt_abc.pdf")
                .uploadedAt(LocalDateTime.now())
                .build();

        User admin = User.builder().id("ADMIN01").name("Admin").build();
        User customer = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Test User")
                .build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(uploadedFileRepository.findById("FL000001")).thenReturn(Optional.of(file));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(authService.getCurrentUser(true)).thenReturn(admin);
        when(userRepository.findById("USER001")).thenReturn(Optional.of(customer));
        @SuppressWarnings("unchecked")
        Specification<OrderProduct> anySpec = any(Specification.class);
        when(orderProductRepository.findAll(anySpec)).thenReturn(List.of());
        doThrow(new RuntimeException("Email unavailable"))
                .when(mailService).sendOrderStatusUpdate(any(), any(), any(), any(), any(), any(), any());

        Order result = orderService.uploadReceiptAsAdmin("ORD001", "FL000001");

        assertEquals(OrderStatus.CONFIRMING_PAYMENT, result.getStatus());
        assertEquals("FL000001", result.getReceiptFileId());
    }

    @Test
    void uploadReceiptAsAdmin_DoesNotCheckOwnership() {
        // Admin should be able to upload receipt for any order regardless of customer
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        UploadedFile file = UploadedFile.builder()
                .id("FL000001")
                .originalName("receipt.pdf")
                .storedName("receipt_abc.pdf")
                .contentType("application/pdf")
                .size(1024L)
                .url("/uploads/receipt_abc.pdf")
                .uploadedAt(LocalDateTime.now())
                .build();

        User admin = User.builder().id("ADMIN99").name("Different Admin").build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(uploadedFileRepository.findById("FL000001")).thenReturn(Optional.of(file));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(authService.getCurrentUser(true)).thenReturn(admin);

        // Should succeed without ownership check
        Order result = orderService.uploadReceiptAsAdmin("ORD001", "FL000001");

        assertEquals(OrderStatus.CONFIRMING_PAYMENT, result.getStatus());
        assertEquals("FL000001", result.getReceiptFileId());
    }

    @Test
    void uploadReceiptAsAdmin_WhenConfirmingPayment_ShouldReplaceReceipt() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.CONFIRMING_PAYMENT)
                .receiptFileId("FL000001")
                .createdAt(LocalDateTime.now())
                .build();

        UploadedFile newFile = UploadedFile.builder()
                .id("FL000002")
                .originalName("new-receipt.pdf")
                .storedName("new-receipt_abc.pdf")
                .contentType("application/pdf")
                .size(2048L)
                .url("/uploads/new-receipt_abc.pdf")
                .uploadedAt(LocalDateTime.now())
                .build();

        User admin = User.builder().id("ADMIN01").name("Admin").build();

        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(order));
        when(uploadedFileRepository.findById("FL000002")).thenReturn(Optional.of(newFile));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(authService.getCurrentUser(true)).thenReturn(admin);

        Order result = orderService.uploadReceiptAsAdmin("ORD001", "FL000002");

        assertEquals(OrderStatus.CONFIRMING_PAYMENT, result.getStatus());
        assertEquals("FL000002", result.getReceiptFileId());
    }
}

