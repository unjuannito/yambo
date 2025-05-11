package es.yambo_alco.web;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class WebApplicationTest {

	@Test
	void contextLoads() {
		// This test verifies that the Spring application context loads successfully
	}

	@Test
	void main() {
		// This test verifies that the main method runs without throwing any exceptions
		WebApplication.main(new String[] {});
	}

}