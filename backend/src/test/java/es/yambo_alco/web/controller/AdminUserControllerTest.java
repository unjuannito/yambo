package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminUserController.class)
@Import(TestSecurityConfig.class)
public class AdminUserControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UserService userService;

    @Test
    @WithMockUser(authorities  = "LIST_USERS")
    public void listUsers_ok() throws Exception {
        User u = User.builder().id(1L).username("u").email("a@b.com").name("User").enabled(true).build();
    Mockito.when(userService.listUsers(Mockito.anyString(), Mockito.anyString(), Mockito.any(), Mockito.anyList(), Mockito.anyList(), Mockito.any(PageRequest.class))).thenReturn(new PageImpl<>(List.of(u)));

        mvc.perform(get("/admin/users").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
