package es.yambo_alco.web.service;

import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

public class UserServiceTest {

    private UserRepository userRepository;
    private UserService userService;

    @BeforeEach
    public void setup() {
        userRepository = Mockito.mock(UserRepository.class);
        userService = new UserService(userRepository);
    }

    @Test
    public void listUsers_returnsPageFromRepository() {
        User u = User.builder().id(1L).username("u").email("a@b.com").name("User").enabled(true).build();
        Page<User> page = new PageImpl<>(List.of(u));
        when(userRepository.findAll(Mockito.<Specification<User>>any(), Mockito.any(PageRequest.class)))
                .thenReturn(page);

        Page<User> res = userService.listUsers(null, null, null, (List<String>) null, (List<String>) null,
                PageRequest.of(0, 10));
        assertThat(res.getTotalElements()).isEqualTo(1);
        assertThat(res.getContent().get(0).getUsername()).isEqualTo("u");
    }
}
