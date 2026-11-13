package es.yambo_alco.web.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
public class AsyncConfig {

    @Bean(name = "mailExecutor")
    public Executor mailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("mail-");
        executor.initialize();
        return executor;
    }

    @Bean(name = "batchExecutor")
    public Executor batchExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(20);
        executor.setThreadNamePrefix("batch-");
        executor.initialize();
        return executor;
    }

    /**
     * Render de cuerpos Thymeleaf de usuario (issue #123, Part 2): aislado del
     * resto de la app para poder acotar un timeout por render sin afectar a
     * nada más si un {@code th:each} sobre datos inesperadamente grandes (o
     * cualquier otro bucle problemático) se queda atascado.
     */
    @Bean(name = "templateRenderExecutor")
    public AsyncTaskExecutor templateRenderExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(20);
        executor.setThreadNamePrefix("tpl-render-");
        // Si la cola se llena bajo carga, renderiza en el hilo llamante en vez de
        // lanzar TaskRejectedException: todo correo automático pasa por aquí ahora
        // (import 109-04), así que el rechazo no puede tirar un envío entero.
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
