package es.yambo_alco.web.model.enums;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class ActivityStatusTest {

    @Test
    public void values_ShouldHaveFiveEntries() {
        assertThat(ActivityStatus.values()).hasSize(5);
    }

    @ParameterizedTest
    @EnumSource(ActivityStatus.class)
    public void eachStatus_ShouldHaveNonNullLabelAndColor(ActivityStatus status) {
        assertThat(status.getLabel()).isNotNull().isNotEmpty();
        assertThat(status.getColor()).isNotNull().startsWith("#");
    }

    @Test
    public void fromValue_WithValidValues_ShouldReturnCorrectStatus() {
        assertThat(ActivityStatus.fromValue(0)).isEqualTo(ActivityStatus.PLANNED);
        assertThat(ActivityStatus.fromValue(1)).isEqualTo(ActivityStatus.OPEN_REGISTRATION);
        assertThat(ActivityStatus.fromValue(2)).isEqualTo(ActivityStatus.REGISTRATION_CLOSED);
        assertThat(ActivityStatus.fromValue(3)).isEqualTo(ActivityStatus.CLOSED);
        assertThat(ActivityStatus.fromValue(4)).isEqualTo(ActivityStatus.CANCELLED);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 5, 99, 1000})
    public void fromValue_WithInvalidValue_ShouldThrowIllegalArgument(int value) {
        assertThatThrownBy(() -> ActivityStatus.fromValue(value))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown ActivityStatus value");
    }

    @Test
    public void planned_ShouldHaveExpectedProperties() {
        ActivityStatus status = ActivityStatus.PLANNED;
        assertThat(status.getValue()).isEqualTo(0);
        assertThat(status.getLabel()).isEqualTo("Planificada");
        assertThat(status.getColor()).isEqualTo("#3b82f6");
    }

    @Test
    public void cancelled_ShouldHaveExpectedProperties() {
        ActivityStatus status = ActivityStatus.CANCELLED;
        assertThat(status.getValue()).isEqualTo(4);
        assertThat(status.getLabel()).isEqualTo("Cancelada");
        assertThat(status.getColor()).isEqualTo("#ef4444");
    }

    @Test
    public void valuesHaveUniqueIntegers() {
        ActivityStatus[] all = ActivityStatus.values();
        long distinctCount = java.util.Arrays.stream(all)
                .mapToInt(ActivityStatus::getValue)
                .distinct()
                .count();
        assertThat(distinctCount).isEqualTo(all.length);
    }
}
