package es.yambo_alco.web.util;

import java.security.SecureRandom;
import java.util.function.Predicate;

/**
 * Utility class for generating unique alphanumeric IDs.
 */
public class IdGenerator {
    
    private static final String ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int ID_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_ATTEMPTS = 10;
    
    /**
     * Generates a unique 8-character alphanumeric ID.
     * @param existsChecker Predicate to check if an ID already exists
     * @return A unique 8-character alphanumeric ID
     * @throws IllegalStateException if unable to generate unique ID after MAX_ATTEMPTS
     */
    public static String generateUniqueId(Predicate<String> existsChecker) {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String id = generateId();
            if (!existsChecker.test(id)) {
                return id;
            }
        }
        throw new IllegalStateException("Unable to generate unique ID after " + MAX_ATTEMPTS + " attempts");
    }
    
    /**
     * Generates a random 8-character alphanumeric ID.
     * @return A random 8-character alphanumeric ID
     */
    private static String generateId() {
        StringBuilder sb = new StringBuilder(ID_LENGTH);
        for (int i = 0; i < ID_LENGTH; i++) {
            int index = RANDOM.nextInt(ALPHANUMERIC.length());
            sb.append(ALPHANUMERIC.charAt(index));
        }
        return sb.toString();
    }
}
